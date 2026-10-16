
import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import Products from './pages/Products.jsx'
import Checkout from './pages/Checkout.jsx'
import MyOrders from './pages/MyOrders.jsx'
import AdminProducts from './pages/AdminProducts.jsx'
import AdminOrders from './pages/AdminOrders.jsx'
import AdminMembers from './pages/AdminMembers.jsx'

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Products />} />
      <Route path="/products" element={<Navigate to="/" replace />} />
      <Route path="/checkout" element={<Checkout />} />
      <Route path="/my-orders" element={<MyOrders />} />

      <Route path="/admin/products" element={<AdminProducts />} />
      <Route path="/admin/orders" element={<AdminOrders />} />
      <Route path="/admin/members" element={<AdminMembers />} />

      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default AppRoutes
