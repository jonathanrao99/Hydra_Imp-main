import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

export interface MediaContent {
  id: string
  title: string
  description: string
  file_url: string
  file_type: 'image' | 'video'
  page_section: 'asset_protection' | 'disaster_response' | 'traffic_management' | 'advertisement' | 'lake_rejuvenation'
  created_at: string
}

export const useMediaContent = (section: string) => {
  const [mediaItems, setMediaItems] = useState<MediaContent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchMediaContent = async () => {
      try {
        const { data, error } = await supabase
          .from('media_content')
          .select('*')
          .eq('page_section', section)
          .order('created_at', { ascending: false })

        if (error) throw error
        setMediaItems(data || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchMediaContent()
  }, [section])

  return { mediaItems, loading, error }
} 