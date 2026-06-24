import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { CartProvider }     from "@/context/CartContext";
import { WishlistProvider } from "@/context/WishlistContext";
import { AuthProvider }     from "@/context/AuthContext";
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
import WhatsAppFloat from "@/components/site/WhatsAppFloat";

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <WishlistProvider>
          <div className="App">
            <BrowserRouter>
              <Routes>
                <Route path="/"               element={<Home />} />
                <Route path="/shop"           element={<Shop />} />
                <Route path="/shop/:category" element={<Shop />} />
                <Route path="/product/:slug"  element={<ProductDetail />} />
                <Route path="/cart"           element={<Cart />} />
                <Route path="/wishlist"       element={<Wishlist />} />
                <Route path="/login"          element={<Login />} />
                <Route path="/checkout"       element={<Checkout />} />
                <Route path="/account"        element={<Account />} />
                <Route path="/services"       element={<Services />} />
                <Route path="/book/:serviceId" element={<Book />} />
                <Route path="/admin"          element={<Admin />} />
                <Route path="/orders/:orderId" element={<OrderDetail />} />
                <Route path="/search"         element={<Search />} />
              </Routes>
            </BrowserRouter>
            <Toaster richColors position="top-center" />
            <WhatsAppFloat />
          </div>
        </WishlistProvider>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;
