import { Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './context/AuthContext'
import CompleteProfileModal from './components/CompleteProfileModal'
import HomePage from './pages/HomePage'
import BrowsePage from './pages/BrowsePage'
import ListingDetailPage from './pages/ListingDetailPage'
import GuestDashboard from './pages/GuestDashboard'
import HostDashboard from './pages/HostDashboard'
import BecomeHostPage from './pages/BecomeHostPage'
import CreateListingPage from './pages/CreateListingPage'


import AboutPage from './pages/AboutPage'
import ContactPage from './pages/ContactPage'
import AdminPanel from './pages/AdminPanel'
import EditListingPage from './pages/EditListingPage'
import PropertiesForSalePage from './pages/PropertiesForSalePage'
import PropertySaleDetailPage from './pages/PropertySaleDetailPage'
import ListPropertyForSalePage from './pages/ListPropertyForSalePage'

function AppContent() {
  const { needsProfile } = useAuth()

  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#111111',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.08)',
          },
        }}
      />
      {needsProfile && <CompleteProfileModal />}
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/browse" element={<BrowsePage />} />
        <Route path="/listings/:id" element={<ListingDetailPage />} />
        <Route path="/dashboard/guest" element={<GuestDashboard />} />
        <Route path="/dashboard/host" element={<HostDashboard />} />
        <Route path="/become-host" element={<BecomeHostPage />} />
        <Route path="/host/listings/new" element={<CreateListingPage />} />
        <Route path="/host/listings/:id/edit" element={<EditListingPage />} />
        <Route path="/properties-for-sale" element={<PropertiesForSalePage />} />
        <Route path="/properties-for-sale/:id" element={<PropertySaleDetailPage />} />
        <Route path="/properties-for-sale/list" element={<ListPropertyForSalePage />} />
        <Route path="/admin" element={<AdminPanel />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/admin-panel" element={<AdminPanel />} />
      </Routes>
    </>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}