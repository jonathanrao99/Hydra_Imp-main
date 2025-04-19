return (
  <div className="bg-white rounded-xl shadow-lg p-6">
    <h2 className="text-2xl font-bold text-center text-gray-800 mb-4">Live Updates</h2>
    
    <div className="relative w-full max-w-4xl mx-auto">
      <div className="overflow-hidden rounded-lg shadow-lg">
        {liveUpdates.map((update, index) => (
          <div
            key={update.id}
            className={`transition-opacity duration-500 ${
              index === currentSlide ? 'opacity-100' : 'opacity-0 hidden'
            }`}
          >
            <div className="bg-white p-6 text-center">
              {update.link_to_news_id ? (
                <a 
                  href={update.link_to_news_id} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-xl font-semibold text-blue-600 hover:text-blue-800 transition-colors duration-300"
                >
                  {update.title}
                </a>
              ) : (
                <p className="text-xl font-semibold text-gray-800">{update.title}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Navigation Dots */}
      <div className="flex justify-center mt-3 space-x-2">
        {liveUpdates.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentSlide(index)}
            className={`w-2 h-2 rounded-full transition-colors duration-300 ${
              index === currentSlide ? 'bg-blue-600' : 'bg-gray-300'
            }`}
          />
        ))}
      </div>
    </div>
  </div>
) 