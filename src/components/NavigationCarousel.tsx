import React, { useState } from 'react';
import { Link } from 'react-router-dom';

interface NavItem {
  title: string;
  path: string;
  description: string;
}

const NavigationCarousel: React.FC = () => {
  // State for slider is no longer needed since it's a static layout

  const navItems: NavItem[] = [
    { title: 'Fire NOC Application', path: '/services/fire-noc', description: 'Submit your Fire NOC application securely and quickly.' },
    { title: 'Grievances', path: '/services/grievances', description: 'Raise issues and track grievance handling progress.' },
    { title: 'Water Logging Map', path: '/disaster-response#water-logging-points', description: 'Explore real-time water logging hotspots on the map.' },
    { title: 'Lake Rejuvenation', path: '/asset-protection#lake-rejuvenation', description: 'Learn about our lake cleaning and rejuvenation projects.' },
    { title: 'News', path: '/news', description: 'Stay updated with the latest announcements and news.' }    
  ];

  return (
    <div className="relative bg-gradient-to-r from-blue-50 via-white to-blue-50 py-10 px-6 rounded-2xl shadow-lg my-8">
      <h2 className="text-3xl font-extrabold text-center mb-8 text-gray-900 tracking-tight">Quick Navigation</h2>
      <div className="flex overflow-x-auto justify-center space-x-6 py-4">
        {navItems.map((item, index) => (
          <Link
            key={index}
            to={item.path}
            className="group flex-shrink-0 w-64 h-72 bg-white p-8 rounded-2xl border border-gray-200 shadow-lg transform transition ease-in-out duration-300 hover:scale-105 hover:shadow-2xl hover:border-indigo-500 hover:bg-gray-50 text-left overflow-hidden"
          >
            <h3 className="text-xl font-bold text-gray-900 group-hover:text-indigo-600">{item.title}</h3>
            <p className="mt-4 text-sm text-gray-600 leading-relaxed">{item.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default NavigationCarousel; 