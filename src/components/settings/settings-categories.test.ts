import {
  getAllSettingsCategories,
  getSettingsCategories,
  getSettingsCategory,
  type SettingsCategoryId,
  type SettingsCompany,
  type SettingsRole,
} from './settings-categories';

const expectedIds: SettingsCategoryId[] = [
  'empresa',
  'dados-fiscais',
  'certificado-digital',
  'catalogo',
  'mensagens-automaticas',
  'whatsapp',
  'parcelamento',
  'boletos',
  'taxas-cartao',
  'notificacoes',
  'ponto',
  'administracao',
];

const idsFor = (role: SettingsRole, company?: SettingsCompany) =>
  getSettingsCategories(role, company).map(({ id }) => id);

describe('settings categories registry', () => {
  it('defines exactly the 12 expected categories with complete metadata', () => {
    const categories = getAllSettingsCategories();

    expect(categories).toHaveLength(12);
    expect(categories.map((category) => category.id)).toEqual(expectedIds);
    expect(new Set(categories.map((category) => category.slug)).size).toBe(12);
    expect(categories.map((category) => category.slug)).toEqual(expectedIds);

    for (const category of categories) {
      expect(category.route).toBe(`settings/${category.slug}`);
      expect(category.title).toEqual(expect.any(String));
      expect(category.title.length).toBeGreaterThan(0);
      expect(category.description).toEqual(expect.any(String));
      expect(category.description.length).toBeGreaterThan(0);
      expect(category.icon).toBeDefined();
      expect(category.roles.length).toBeGreaterThan(0);
    }
  });

  it.each<[SettingsRole, SettingsCategoryId[]]>([
    ['empresa', expectedIds.filter((id) => id !== 'administracao' && id !== 'whatsapp' && id !== 'boletos')],
    ['admin', ['empresa', 'whatsapp', 'notificacoes', 'ponto', 'administracao']],
    ['gestor', ['empresa', 'notificacoes', 'administracao']],
    ['vendedor', []],
  ])('returns the categories visible to %s', (role, expected) => {
    expect(idsFor(role)).toEqual(expected);
  });

  it('locks catalog for non-PRO plans or when its entitlement is disabled', () => {
    expect(getSettingsCategories('empresa', { plan: 'BASIC' }).find(({ id }) => id === 'catalogo')).toMatchObject({
      locked: true,
      lockReason: expect.any(String),
    });
    expect(getSettingsCategories('empresa', { plan: 'PRO', catalogPageAllowed: false }).find(({ id }) => id === 'catalogo')).toMatchObject({
      locked: true,
      lockReason: expect.any(String),
    });
    expect(getSettingsCategories('empresa', { plan: 'PRO', catalogPageAllowed: true }).find(({ id }) => id === 'catalogo')).toMatchObject({
      locked: false,
      lockReason: undefined,
    });
  });

  it('locks automatic messages outside PRO/TRIAL or when its entitlement is disabled', () => {
    expect(getSettingsCategories('empresa', { plan: 'BASIC' }).find(({ id }) => id === 'mensagens-automaticas')?.locked).toBe(true);
    expect(getSettingsCategories('empresa', { plan: 'TRIAL_7_DAYS', autoMessageAllowed: false }).find(({ id }) => id === 'mensagens-automaticas')?.locked).toBe(true);
    expect(getSettingsCategories('empresa', { plan: 'TRIAL_7_DAYS', autoMessageAllowed: true }).find(({ id }) => id === 'mensagens-automaticas')).toMatchObject({ locked: false, lockReason: undefined });
  });

  it('shows boletos unlocked only when boletoAllowed is true', () => {
    expect(getSettingsCategories('empresa', {}).find(({ id }) => id === 'boletos')).toBeUndefined();
    expect(getSettingsCategories('empresa', { boletoAllowed: false }).find(({ id }) => id === 'boletos')).toBeUndefined();
    expect(getSettingsCategories('empresa', { boletoAllowed: true }).find(({ id }) => id === 'boletos')).toMatchObject({
      locked: false,
      lockReason: undefined,
    });
  });

  it('does not invent locks for card rates', () => {
    const categories = getSettingsCategories('empresa', {
      plan: 'BASIC',
      catalogPageAllowed: false,
      autoMessageAllowed: false,
      boletoAllowed: false,
    });

    expect(categories.find(({ id }) => id === 'whatsapp')).toBeUndefined();
    expect(categories.find(({ id }) => id === 'boletos')).toBeUndefined();
    expect(categories.find(({ id }) => id === 'taxas-cartao')).toMatchObject({ locked: false, lockReason: undefined });
  });

  it('does not apply company locks to other roles', () => {
    const company = { plan: 'BASIC', catalogPageAllowed: false, autoMessageAllowed: false, boletoAllowed: false };
    expect(getSettingsCategories('admin', company).every(({ locked }) => locked === false)).toBe(true);
  });

  it('exposes getSettingsCategory lookup', () => {
    const empresa = getSettingsCategory('empresa');
    expect(empresa.slug).toBe('empresa');
    expect(empresa.title).toBe('Empresa');
  });
});
