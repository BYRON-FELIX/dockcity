import { Link } from 'react-router-dom'
import { Star, MapPin, ShieldCheck } from 'lucide-react'

export default function ListingCard({ listing }) {
  const photo = listing.photos?.[0] || 'https://via.placeholder.com/400x250?text=No+Photo'

  return (
    <Link to={`/listings/${listing.id}`} className="block group">
      <div className="bg-[#111111] rounded-xl overflow-hidden border border-white/8 hover:border-gold/40 transition-all duration-300">
        {/* Photo */}
        <div className="relative h-48 overflow-hidden">
          <img
            src={photo}
            alt={listing.title}
            className="w-full h-full object-contain object-center bg-[#0A0A0A] group-hover:scale-105 transition-transform duration-500"
          />
          {listing.is_hourly_available && (
            <span className="absolute top-2 right-2 bg-gold text-dark text-[10px] font-bold px-2 py-1 rounded-full">
              Hourly Available
            </span>
          )}
          {listing.verification_badges?.length > 0 && (
            <div className="absolute top-3 left-3 flex items-center gap-1 bg-gold text-dark text-xs font-bold px-2 py-1 rounded-full">
              <ShieldCheck size={12} />
              Verified
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-4">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="text-white font-semibold text-sm leading-tight line-clamp-1">
              {listing.title}
            </h3>
            {listing.host_average_rating && (
              <div className="flex items-center gap-1 text-gold text-xs shrink-0">
                <Star size={12} fill="currentColor" />
                <span>{listing.host_average_rating}</span>
                <span className="text-white/30">({listing.host_total_reviews})</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1 text-white/50 text-xs mb-3">
            <MapPin size={11} />
            <span>{listing.neighborhood}, {listing.city}</span>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <span className="text-gold font-bold text-base">
                KES {listing.price_per_night_kes?.toLocaleString()}
              </span>
              <span className="text-white/40 text-xs"> / night</span>
            </div>
            <div className="text-white/40 text-xs">
              {listing.bedrooms} bed · {listing.bathrooms} bath
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}