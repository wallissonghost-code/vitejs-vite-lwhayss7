import { useEffect, useState } from "react";
import { Shield, X } from "lucide-react";
import { AdminPanel } from "./AdminPanel";

type CurrentUser = {
  user: string;
};

const TOKEN_KEY = "gxst-token";

export function AdminFloatingPanel() {
  const [token, setToken] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [open, setOpen] = useState(false);

  async function checkAdmin() {
    const savedToken = localStorage.getItem(TOKEN_KEY) || "";
    setToken(savedToken);
    if (!savedToken) {
      setIsAdmin(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${savedToken}` }
      });
      if (!response.ok) {
        setIsAdmin(false);
        return;
      }
      const user = (await response.json()) as CurrentUser;
      setIsAdmin(user.user === "ghost");
    } catch {
      setIsAdmin(false);
    }
  }

  useEffect(() => {
    checkAdmin();
    const timer = window.setInterval(checkAdmin, 2500);
    return () => window.clearInterval(timer);
  }, []);

  if (!isAdmin || !token) return null;

  return (
    <>
      <button className="admin-float-button" onClick={() => setOpen(true)}>
        <Shield size={20} />
        Admin
      </button>

      {open && (
        <div className="admin-floating-backdrop">
          <section className="admin-floating-card">
            <button className="admin-floating-close" onClick={() => setOpen(false)} aria-label="Fechar admin">
              <X />
            </button>
            <AdminPanel token={token} onVideosChanged={() => window.location.reload()} />
          </section>
        </div>
      )}
    </>
  );
}
