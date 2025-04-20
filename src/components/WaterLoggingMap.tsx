import React, { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from 'react-leaflet'
import MarkerClusterGroup from 'react-leaflet-cluster'
import 'leaflet/dist/leaflet.css'
import type { Map } from 'leaflet'

interface Point {
  lat: number
  lng: number
  label: string
}

interface Props {
  points?: Point[]
}

// Data structure for precipitation info per location
interface RainInfo extends Point {
  precipitationMm: number
  precipitationChance: number
}

const WaterLoggingMap = ({ points = [] }: Props) => {
  const center: [number, number] = [17.45, 78.486671] // Central Telangana (moved slightly north)
  const [map, setMap] = useState<Map | null>(null)
  const [precipitationMM, setPrecipitationMM] = useState<number>(0)
  const [precipitationChance, setPrecipitationChance] = useState<number>(0)
  const [rainInfo, setRainInfo] = useState<RainInfo[]>([])
  // Select every 5th point (indices 0,5,10,...) up to 6 locations
  const topPoints = points.filter((_, idx) => idx % 5 === 0).slice(0, 6)

  // Component to initialize the map instance
  const MapInitializer: React.FC = () => {
    const mapInstance = useMap()
    useEffect(() => {
      setMap(mapInstance)
    }, [mapInstance])
    return null
  }

  // Function to reset map to default view
  const resetView = () => {
    if (map) {
      map.flyTo(center, 12)
    }
  }

  // Fetch precipitation for all waterlogging points via Open-Meteo
  useEffect(() => {
    const fetchAllPrecipitation = async () => {
      try {
        const results: RainInfo[] = await Promise.all(
          points.map(async (pt) => {
            const response = await fetch(
              `https://api.open-meteo.com/v1/forecast?latitude=${pt.lat}&longitude=${pt.lng}&hourly=precipitation,precipitation_probability&current_weather=true`
            )
            const data = await response.json()
            console.log('Open-Meteo data for', pt.label, data)
            const nowHour = new Date().toISOString().slice(0, 13)
            const idx = data.hourly.time.findIndex((t: string) => t.slice(0, 13) === nowHour)
            const rain_mm = idx >= 0 ? data.hourly.precipitation[idx] : 0
            const chance = idx >= 0 ? data.hourly.precipitation_probability[idx] : 0
            return { lat: pt.lat, lng: pt.lng, label: pt.label, precipitationMm: rain_mm, precipitationChance: chance }
          })
        )
        setRainInfo(results)
        if (results.length > 0) {
          const highest = results.reduce((prev, curr) =>
            curr.precipitationMm > prev.precipitationMm ? curr : prev
          )
          setPrecipitationMM(highest.precipitationMm)
          setPrecipitationChance(highest.precipitationChance)
        }
      } catch (err) {
        console.error('Open-Meteo fetchAll error:', err)
      }
    }
    fetchAllPrecipitation()
    const intervalId = setInterval(fetchAllPrecipitation, 5 * 60 * 1000)
    return () => clearInterval(intervalId)
  }, [points])

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start' }}>
      <div style={{ flex: '0 0 75%' }}>
        <div style={{ position: 'relative' }}>
          <MapContainer center={center} zoom={12} scrollWheelZoom style={{ height: '600px', width: '100%' }}>
            <MapInitializer />
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            {/* Rain overlay via Circle on each raining point */}
            {rainInfo.map((info, idx) =>
              info.precipitationMm > 0 ? (
                <Circle
                  key={idx}
                  center={[info.lat, info.lng]}
                  radius={500}
                  pathOptions={{ fillColor: 'blue', fillOpacity: 0.3, stroke: false }}
                />
              ) : null
            )}
            <MarkerClusterGroup>
              {points.map((pt, index) => (
                <Marker key={index} position={[pt.lat, pt.lng]}>
                  <Popup>{pt.label.split(' - ')[1]}</Popup>
                </Marker>
              ))}
            </MarkerClusterGroup>
          </MapContainer>
          <button
            onClick={resetView}
            style={{
              position: 'absolute',
              bottom: '10px',
              right: '10px',
              padding: '0.5rem 1rem',
              cursor: 'pointer',
              background: '#fff',
              border: '1px solid #ccc',
              borderRadius: '4px',
              zIndex: 1000,
            }}
          >
            Reset View
          </button>
        </div>
      </div>
      <div style={{ flex: '0 0 25%', paddingLeft: '1rem', maxHeight: '600px', overflowY: 'auto' }}>
        <h3>Top Water Logging Locations</h3>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {topPoints.map((pt, index) => (
            <li
              key={index}
              style={{ cursor: 'pointer', margin: '0.5rem 0', color: '#007bff' }}
              onClick={() => map?.flyTo([pt.lat, pt.lng], 14)}
            >
              {pt.label.split(' - ')[1]}
            </li>
          ))}
        </ul>
        <div style={{ marginTop: '1rem' }}>
          <p><strong>Total water logging points:</strong> {points.length}</p>
          <p><strong>Current precipitation:</strong> {precipitationMM} mm</p>
          <p><strong>Chance of rainfall:</strong> {precipitationChance}%</p>
        </div>
      </div>
    </div>
  )
}

export default WaterLoggingMap
    