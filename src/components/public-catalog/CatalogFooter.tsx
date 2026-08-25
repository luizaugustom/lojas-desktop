import { MapPin, Phone } from 'lucide-react';
import type { BasicCatalogCompany } from '@/hooks/useBasicCatalog';

type Props = {
  company: BasicCatalogCompany;
};

export function CatalogFooter({ company }: Props) {
  const displayName = company.fantasyName?.trim() || company.name;
  const phoneDigits = (company.phone ?? '').replace(/\D/g, '');
  const year = new Date().getFullYear();

  return (
    <footer
      className="mt-12 border-t border-slate-200"
      style={{
        backgroundColor: 'var(--catalog-footer-bg)',
        color: 'var(--catalog-footer-text)',
      }}
    >
      <div className="mx-auto max-w-6xl px-4 py-6 text-sm md:px-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="font-semibold">{displayName}</p>
            {company.address ? (
              <p className="mt-1 flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                <span>{company.address}</span>
              </p>
            ) : null}
          </div>
          {company.phone ? (
            <div>
              <a
                href={phoneDigits ? `tel:+55${phoneDigits}` : undefined}
                className="inline-flex items-center gap-2 hover:opacity-100 opacity-90"
              >
                <Phone className="h-4 w-4" aria-hidden />
                <span>{company.phone}</span>
              </a>
            </div>
          ) : null}
        </div>
        <p className="mt-6 border-t border-slate-200 pt-4 text-xs opacity-70">
          © {year} Montshop
        </p>
      </div>
    </footer>
  );
}