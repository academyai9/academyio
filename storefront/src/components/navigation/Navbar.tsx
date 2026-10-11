import React from "react"
import Link from "next/link"
import { Search, ShoppingBag, User, BookOpen, Calendar, Video, Award } from "lucide-react"

export default function Navbar({ countryCode = "us" }: { countryCode?: string }) {
  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-18 py-3">
          {/* Brand Logo */}
          <Link href={`/${countryCode}`} className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-xl shadow-md group-hover:bg-blue-700 transition-colors">
              A
            </div>
            <div>
              <span className="font-extrabold text-xl tracking-tight text-gray-900 group-hover:text-blue-600 transition-colors">
                Academy<span className="text-blue-600">IO</span>
              </span>
              <span className="block text-[10px] font-semibold text-gray-500 uppercase tracking-widest -mt-1">
                Professional Webinars & CPE
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-2 text-xs font-semibold text-gray-700">
            <Link
              href={`/${countryCode}/webinars`}
              className="px-3 py-2 rounded-lg hover:bg-gray-100 hover:text-blue-600 transition-colors"
            >
              All Webinars
            </Link>
            <Link
              href={`/${countryCode}/webinars/upcoming`}
              className="px-3 py-2 rounded-lg hover:bg-gray-100 hover:text-blue-600 transition-colors flex items-center gap-1.5"
            >
              <Calendar className="w-3.5 h-3.5 text-blue-600" />
              Upcoming
            </Link>
            <Link
              href={`/${countryCode}/webinars/on-demand`}
              className="px-3 py-2 rounded-lg hover:bg-gray-100 hover:text-blue-600 transition-colors flex items-center gap-1.5"
            >
              <Video className="w-3.5 h-3.5 text-emerald-600" />
              On-Demand
            </Link>
            <Link
              href={`/${countryCode}/seminars`}
              className="px-3 py-2 rounded-lg hover:bg-gray-100 hover:text-blue-600 transition-colors flex items-center gap-1.5"
            >
              <BookOpen className="w-3.5 h-3.5 text-purple-600" />
              Seminars
            </Link>
            <Link
              href={`/${countryCode}/categories`}
              className="px-3 py-2 rounded-lg hover:bg-gray-100 hover:text-blue-600 transition-colors"
            >
              Categories
            </Link>
          </nav>

          {/* Right Action Controls */}
          <div className="flex items-center gap-3">
            {/* Search */}
            <Link
              href={`/${countryCode}/search`}
              className="p-2 text-gray-500 hover:text-blue-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="Search webinars"
            >
              <Search className="w-4 h-4" />
            </Link>

            {/* Dashboard / Account */}
            <Link
              href={`/${countryCode}/dashboard`}
              className="hidden sm:flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border border-gray-200 hover:border-blue-400 text-gray-700 hover:text-blue-600 transition-all"
            >
              <User className="w-3.5 h-3.5" />
              <span>Customer Dashboard</span>
            </Link>

            {/* Shopping Cart */}
            <Link
              href={`/${countryCode}/cart`}
              className="flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-colors"
            >
              <ShoppingBag className="w-4 h-4" />
              <span className="hidden sm:inline">Cart</span>
            </Link>
          </div>
        </div>
      </div>
    </header>
  )
}
