import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { CartProvider }     from "@/context/CartContext";
import { WishlistProvider } from "@/context/WishlistContext";
import { AuthProvider }     from "@/context/AuthContext";
import { CompareProvider }  from "@/context/CompareContext";
import Home        from "@/pages/Home";
import Shop        from "@/pages/Shop";
import ProductDetail from "@/pages/ProductDetail";
import Cart        from "@/pages/Cart";
import Wishlist    from "@/pages/Wishlist";
import Login       from "@/pages/Login";
import Checkout    from "@/pages/Checkout";
import Account     from "@/pages/Account";
import Services    from "@/pages/Services";
import Book        from "@/pages/Book";
import Admin       from "@/pages/Admin";
import OrderDetail from "@/pages/OrderDetail";
import Search      from "@/pages/Search";
import SkinQuiz    from "@/pages/SkinQuiz";
import Compare          from "@/pages/Compare";
import BeauticianPortal from "@/pages/BeauticianPortal";
import BeauticianApply  from "@/pages/BeauticianApply";
import WhatsAppFloat from "@/components/site/WhatsAppFloat";
import CompareBar    from "@/components/site/CompareBar";

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <WishlistProvider>
          <CompareProvider>
            <div className="App">
              <BrowserRouter>
                <Routes>
                  <Route path="/"                element={<Home />} />
                  <Route path="/shop"            element={<Shop />} />
                  <Route path="/shop/:category"  element={<Shop />} />
                  <Route path="/product/:slug"   element={<ProductDetail />} />
                  <Route path="/cart"            element={<Cart />} />
                  <Route path="/wishlist"        element={<Wishlist />} />
                  <Route path="/login"           element={<Login />} />
                  <Route path="/checkout"        element={<Checkout />} />
                  <Route path="/account"         element={<Account />} />
                  <Route path="/services"        element={<Services />} />
                  <Route path="/book/:serviceId" element={<Book />} />
                  <Route path="/admin"           element={<Admin />} />
                  <Route path="/orders/:orderId" element={<OrderDetail />} />
                  <Route path="/search"          element={<Search />} />
                  <Route path="/skin-quiz"       element={<SkinQuiz />} />
                  <Route path="/compare"         element={<Compare />} />
                  <Route path="/duty"               element={<BeauticianPortal />} />
                  <Route path="/beautician/apply"  element={<BeauticianApply />} />
                </Routes>
                <CompareBar />
              </BrowserRouter>
              <Toaster richColors position="top-center" />
              <WhatsAppFloat />
            </div>
          </CompareProvider>
        </WishlistProvider>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;
