import AdvertisementCarousel from '../components/AdvertisementCarousel'

const Advertisement = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold text-center text-gray-800 mb-12">Advertisement Monitoring</h1>

      {/* Main Content Sections */}
      <div className="space-y-8 mb-12">
        {/* Advertisement Monitoring Section */}
        <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-duration-300">
          <h2 className="text-2xl font-semibold text-blue-600 mb-6">Advertisement Monitoring</h2>
          <p className="text-gray-700 leading-relaxed">
            HYDRAA's Advertisement Monitoring Wing is responsible for overseeing and regulating advertisements within its jurisdiction, ensuring compliance with local regulations and maintaining the aesthetic integrity of the city.
          </p>
        </div>

        {/* Advertisement Monitoring Media Section */}
        <AdvertisementCarousel />

        {/* Compliance Section */}
        <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-duration-300">
          <h2 className="text-2xl font-semibold text-blue-600 mb-6">Compliance and Regulation</h2>
          <p className="text-gray-700 leading-relaxed">
            The Advertisement Monitoring Wing works closely with businesses and advertisers to ensure that all advertisements comply with local regulations, including size, placement, and content guidelines.
          </p>
        </div>

        {/* Enforcement Section */}
        <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-duration-300">
          <h2 className="text-2xl font-semibold text-blue-600 mb-6">Enforcement and Action</h2>
          <p className="text-gray-700 leading-relaxed">
            In cases of non-compliance, the Advertisement Monitoring Wing takes appropriate enforcement actions, including issuing notices, fines, and removal orders for unauthorized advertisements.
          </p>
        </div>
      </div>
    </div>
  )
}

export default Advertisement 