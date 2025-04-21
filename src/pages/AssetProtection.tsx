import React, { useEffect } from 'react'
import assetProtectionMap from '../assets/images/Asset-Protection-Map.jpg'
import AssetProtectionCarousel from '../components/AssetProtectionCarousel'
import LakeRejuvenationCarousel from '../components/LakeRejuvenationCarousel'

const AssetProtection = () => {
  // Scroll to Lake Rejuvenation section if hash present
  useEffect(() => {
    if (window.location.hash === '#lake-rejuvenation') {
      const section = document.getElementById('lake-rejuvenation');
      if (section) {
        const yOffset = -20;
        const y = section.getBoundingClientRect().top + window.pageYOffset + yOffset;
        window.scrollTo({ top: y, behavior: 'smooth' });
      }
    }
  }, []);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold text-center text-gray-800 mb-12">Asset Protection</h1>

      {/* Main Content Sections */}
      <div className="space-y-8 mb-12">
        {/* Protection of Assets Section */}
        <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-duration-300">
          <h2 className="text-2xl font-semibold text-blue-600 mb-6">Protection of Government and Local Body Assets</h2>
          <p className="text-gray-700 leading-relaxed mb-6">
            HYDRAA is responsible for safeguarding the assets of Local Bodies and Government entities—such as parks, designated layout open spaces, playgrounds, lakes, nalas (drains), land parcels, roads, carriageways, and footpaths—from encroachments and unauthorized occupation.
          </p>
          
          {/* Asset Categories Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
            {[
              { title: 'Government Lands', icon: '🏛️' },
              { title: 'Parks', icon: '🌳' },
              { title: 'Open Spaces', icon: '🌲' },
              { title: 'Community / Society Places', icon: '🏘️' },
              { title: 'Protection of Lakes', icon: '💧' },
              { title: 'Lakes Rejuvenation', icon: '🌊' },
              { title: 'Protection of Nalas', icon: '🌊' },
              { title: 'FTL Demarcation', icon: '📏' }
            ].map((item, index) => (
              <div 
                key={index}
                className="bg-blue-50 rounded-lg p-4 hover:bg-blue-100 transition-colors duration-300"
              >
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{item.icon}</span>
                  <span className="font-semibold text-blue-800">{item.title}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Asset Protection Activities Carousel */}
        <AssetProtectionCarousel />

        {/* Lake Rejuvenation Section */}
        <div id="lake-rejuvenation" className="scroll-mt-24">
          <h2 className="text-3xl font-bold text-center text-gray-800 mb-6">Lake Rejuvenation</h2>
          <LakeRejuvenationCarousel />
        </div>

        {/* Lake Encroachments Section */}
        <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-duration-300">
          <h2 className="text-2xl font-semibold text-blue-600 mb-6">Protection of Lakes</h2>
          <p className="text-gray-700 leading-relaxed">
            In coordination with GHMC, HMDA, local bodies, the Irrigation Department, the Revenue Department, and other relevant agencies, HYDRAA undertakes the removal of encroachments affecting lakes and water bodies.
          </p>
        </div>

        {/* Inspection Section */}
        <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-duration-300">
          <h2 className="text-2xl font-semibold text-blue-600 mb-6">Inspection of Private Premises for Regulatory Compliance</h2>
          <p>
          To inspect private premises for:
          <ul className="list-disc list-inside text-gray-700">
            <li>Building and town planning regulation</li>
            <li>Removal of dilapidated structures endangering public safety</li>
          </ul><br></br>
          </p>
          <p>Whenever such requests are received from government agencies like ULBs, UDAs and planning authorities.
          </p><br></br>
          <p>In exercise of such powers, the HYDRAA authorities shall be deemed to be working under such ULBs, UDA and planning authorities, under the relevant Acts, Rules and Regulations of ULBs, UDA and planning authorities.
          </p>
        </div>
      </div>

      {/* Asset Protection Map Section */}
      <div className="mt-12">
        <h2 className="text-3xl font-bold text-gray-800 mb-6">Asset Protection Jurisdiction Map</h2>
        <div className="flex flex-col items-center">
          <img 
            src={assetProtectionMap} 
            alt="HYDRAA Asset Protection Units Map" 
            className="w-full max-w-4xl rounded-lg shadow-md mb-6"
          />
          <div className="w-full max-w-4xl">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-bold text-blue-600 mb-2">Cyberabad - 7 Units</h3>
                <ul className="list-disc list-inside text-gray-700">
                  <li>Madhapur</li>
                  <li>Gachibowli</li>
                  <li>Kukatpally</li>
                  <li>Balanagar - Medical</li>
                  <li>Rajendranagar - Nursing</li>
                  <li>Shamshabad</li>
                  <li>Patancheru</li>
                </ul>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-bold text-blue-600 mb-2">Hyderabad - 4 Units</h3>
                <ul className="list-disc list-inside text-gray-700">
                  <li>Hyderabad West</li>
                  <li>Hyderabad North East</li>
                  <li>Hyderabad Central</li>
                  <li>Hyderabad South</li>
                </ul>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-bold text-blue-600 mb-2">Rachakonda - 4 Units</h3>
                <ul className="list-disc list-inside text-gray-700">
                  <li>Malkajgiri</li>
                  <li>Saroornagar</li>
                  <li>Bhongir-Yadadri</li>
                  <li>Pahadi Shareef - Adibatla</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AssetProtection 