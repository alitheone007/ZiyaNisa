import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import Home from "@/pages/Home";

/**
 * ZiyaNisa — App entry.
 *
 * PHASE 1 (current): One-page visual preview at "/".
 *
 * PENDING (next AI / phases — implement when ready):
 *   - /shop, /shop/:category, /product/:slug          (Product marketplace)
 *   - /cart, /checkout                                (Cart + Checkout placeholder)
 *   - /services, /services/:slug, /book/:serviceId    (At-home salon booking flow)
 *   - /beautician/:id                                 (Beautician profile)
 *   - /account, /account/orders, /account/bookings    (Customer dashboard)
 *   - /wishlist
 *   - /vendor/onboarding, /vendor/dashboard
 *   - /beautician/onboarding, /beautician/dashboard
 *   - /admin                                          (Role-gated admin)
 *   - /about, /journal, /ittar, /jewellery, /login    (Static + auth)
 *
 * See /app/memory/PRD.md (created on finish) and
 *     /app/backend/sql_schema_reference.sql for full data model.
 */
function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          {/* TODO(next-AI): add routes listed above as those pages are built */}
        </Routes>
      </BrowserRouter>
      <Toaster richColors position="top-center" />
    </div>
  );
}

export default App;
