import React, { useState, useEffect, useRef } from 'react'
import ChiefMinisterSection from '../components/ChiefMinisterSection'
import PrincipalSecretarySection from '../components/PrincipalSecretarySection'
import CommissionerSection from '../components/CommissionerSection'
import NavigationCarousel from '../components/NavigationCarousel'
import { supabase } from '../supabaseClient'

interface LiveUpdate {
  id: number
  title: string
  created_at: string
  link_to_news_id: number | null
}

const Home = () => {
  const [activeSection, setActiveSection] = useState<'cm' | 'ps' | 'commissioner'>('cm')
  const [isPaused, setIsPaused] = useState(false)
  const [touchStart, setTouchStart] = useState(0)
  const [touchEnd, setTouchEnd] = useState(0)
  const [liveUpdates, setLiveUpdates] = useState<LiveUpdate[]>([])
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Fetch live updates from Supabase
    const fetchLiveUpdates = async () => {
      const { data, error } = await supabase
        .from('live_updates')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5)

      if (error) {
        console.error('Error fetching live updates:', error)
        return
      }

      setLiveUpdates(data || [])
    }

    fetchLiveUpdates()

    // Set up real-time subscription
    const subscription = supabase
      .channel('live_updates_channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'live_updates' }, () => {
        fetchLiveUpdates()
      })
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (isPaused) return

    const interval = setInterval(() => {
      setActiveSection(prev => {
        if (prev === 'cm') return 'ps'
        if (prev === 'ps') return 'commissioner'
        return 'cm'
      })
    }, 7000)

    return () => clearInterval(interval)
  }, [isPaused])

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX)
  }

  const handleTouchEnd = () => {
    if (touchStart - touchEnd > 50) {
      // Swipe left
      setActiveSection(prev => {
        if (prev === 'cm') return 'ps'
        if (prev === 'ps') return 'commissioner'
        return 'cm'
      })
      setIsPaused(true)
    } else if (touchEnd - touchStart > 50) {
      // Swipe right
      setActiveSection(prev => {
        if (prev === 'commissioner') return 'ps'
        if (prev === 'ps') return 'cm'
        return 'commissioner'
      })
      setIsPaused(true)
    }
  }

  const handleClick = () => {
    setIsPaused(!isPaused)
  }

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation()
    setActiveSection(prev => {
      if (prev === 'commissioner') return 'ps'
      if (prev === 'ps') return 'cm'
      return 'commissioner'
    })
    setIsPaused(true)
  }

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation()
    setActiveSection(prev => {
      if (prev === 'cm') return 'ps'
      if (prev === 'ps') return 'commissioner'
      return 'cm'
    })
    setIsPaused(true)
  }

  return (
    <div className="relative">
      <div 
        className="relative overflow-hidden cursor-pointer"
        onClick={handleClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        ref={containerRef}
      >
        {/* Pause Indicator */}
        {isPaused && (
          <div className="absolute top-4 right-4 z-30 bg-white/80 text-blue-600 px-3 py-1 rounded-full text-sm font-semibold shadow-lg">
            Paused
          </div>
        )}

        {/* Navigation Arrows */}
        <button
          onClick={handlePrev}
          className="absolute left-4 top-1/2 transform -translate-y-1/2 z-20 bg-white/80 hover:bg-white text-blue-600 rounded-full p-2 shadow-lg transition-all duration-300 hover:scale-110"
          style={{ display: activeSection === 'cm' ? 'none' : 'block' }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <button
          onClick={handleNext}
          className="absolute right-4 top-1/2 transform -translate-y-1/2 z-20 bg-white/80 hover:bg-white text-blue-600 rounded-full p-2 shadow-lg transition-all duration-300 hover:scale-110"
          style={{ display: activeSection === 'commissioner' ? 'none' : 'block' }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/* Indicator Dots */}
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2 z-20">
          <div
            className={`w-3 h-3 rounded-full transition-colors duration-300 ${
              activeSection === 'cm' ? 'bg-blue-600' : 'bg-gray-300'
            }`}
          />
          <div
            className={`w-3 h-3 rounded-full transition-colors duration-300 ${
              activeSection === 'ps' ? 'bg-blue-600' : 'bg-gray-300'
            }`}
          />
          <div
            className={`w-3 h-3 rounded-full transition-colors duration-300 ${
              activeSection === 'commissioner' ? 'bg-blue-600' : 'bg-gray-300'
            }`}
          />
        </div>

        {/* Sections */}
        <div className="relative z-10 bg-white pt-4 md:pt-6 pb-8">
          {activeSection === 'cm' && <ChiefMinisterSection />}
          {activeSection === 'ps' && <PrincipalSecretarySection />}
          {activeSection === 'commissioner' && <CommissionerSection />}
        </div>
      </div>

      {/* Navigation Carousel */}
      <NavigationCarousel />
    </div>
  )
}

export default Home