import Link from "next/link";
import { IconArrowLeft, IconAlertTriangle } from "@tabler/icons-react";

export default function NotFound() {
  return (
    <div className="page page-center d-flex flex-column align-items-center justify-content-center min-vh-100 bg-dark text-white p-4">
      <div className="container-tight py-4 text-center">
        <div className="empty">
          <div className="empty-icon text-warning mb-3">
            <IconAlertTriangle size={56} />
          </div>
          <div className="empty-header fs-1 fw-bold text-danger mb-2 font-monospace">404</div>
          <p className="empty-title fs-2 fw-bold text-white mb-2">Sahifa topilmadi</p>
          <p className="empty-subtitle text-secondary mb-4">
            Siz qidirayotgan sahifa mavjud emas yoki boshqa manzilga ko&apos;chirilgan.
          </p>
          <div className="empty-action">
            <Link href="/" className="btn btn-primary d-inline-flex align-items-center gap-2">
              <IconArrowLeft size={16} />
              <span>Bosh sahifaga qaytish</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

