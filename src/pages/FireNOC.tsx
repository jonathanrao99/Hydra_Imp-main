import React, { useState } from 'react'
import { supabase } from '../supabaseClient'

interface FireNOCFormData {
  name: string
  email: string
  phone: string
  address: string
  propertyType: string
  propertyArea: number
  floors: number
  propertyAddress: string
  buildingPlanUrl: string
  ownershipUrl: string
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
}

const FireNOC = () => {
  const [formData, setFormData] = useState<FireNOCFormData>({
    name: '',
    email: '',
    phone: '',
    address: '',
    propertyType: '',
    propertyArea: 0,
    floors: 0,
    propertyAddress: '',
    buildingPlanUrl: '',
    ownershipUrl: '',
    status: 'pending',
    created_at: new Date().toISOString()
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleFileUpload = async (file: File, type: 'buildingPlan' | 'ownership') => {
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}.${fileExt}`
      const filePath = `fire-noc/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath)

      setFormData(prev => ({
        ...prev,
        [type === 'buildingPlan' ? 'buildingPlanUrl' : 'ownershipUrl']: publicUrl
      }))
    } catch (error) {
      console.error('Error uploading file:', error)
      setError('Error uploading file. Please try again.')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { error } = await supabase
        .from('fire_noc_applications')
        .insert([formData])

      if (error) throw error

      setSuccess(true)
      setFormData({
        name: '',
        email: '',
        phone: '',
        address: '',
        propertyType: '',
        propertyArea: 0,
        floors: 0,
        propertyAddress: '',
        buildingPlanUrl: '',
        ownershipUrl: '',
        status: 'pending',
        created_at: new Date().toISOString()
      })
    } catch (error) {
      console.error('Error submitting application:', error)
      setError('Error submitting application. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Apply for Fire Service NOC</h1>
      
      {success ? (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 max-w-3xl mx-auto">
          <h2 className="text-xl font-semibold text-green-800 mb-4">Application Submitted Successfully!</h2>
          <p className="text-green-700">Your application has been received. We will review it and get back to you soon.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-3xl mx-auto">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* Personal Information */}
            <div>
              <h2 className="text-xl font-semibold text-blue-600 mb-4">Personal Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-gray-700 mb-2" htmlFor="name">
                    Full Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter your full name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-700 mb-2" htmlFor="email">
                    Email Address
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter your email"
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-700 mb-2" htmlFor="phone">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter your phone number"
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-700 mb-2" htmlFor="address">
                    Address
                  </label>
                  <input
                    type="text"
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter your address"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Property Details */}
            <div>
              <h2 className="text-xl font-semibold text-blue-600 mb-4">Property Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-gray-700 mb-2" htmlFor="propertyType">
                    Property Type
                  </label>
                  <select
                    id="propertyType"
                    value={formData.propertyType}
                    onChange={(e) => setFormData(prev => ({ ...prev, propertyType: e.target.value }))}
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select property type</option>
                    <option value="residential">Residential</option>
                    <option value="commercial">Commercial</option>
                    <option value="industrial">Industrial</option>
                    <option value="institutional">Institutional</option>
                  </select>
                </div>
                <div>
                  <label className="block text-gray-700 mb-2" htmlFor="propertyArea">
                    Property Area (sq ft)
                  </label>
                  <input
                    type="number"
                    id="propertyArea"
                    value={formData.propertyArea}
                    onChange={(e) => setFormData(prev => ({ ...prev, propertyArea: Number(e.target.value) }))}
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter property area"
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-700 mb-2" htmlFor="floors">
                    Number of Floors
                  </label>
                  <input
                    type="number"
                    id="floors"
                    value={formData.floors}
                    onChange={(e) => setFormData(prev => ({ ...prev, floors: Number(e.target.value) }))}
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter number of floors"
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-700 mb-2" htmlFor="propertyAddress">
                    Property Address
                  </label>
                  <textarea
                    id="propertyAddress"
                    value={formData.propertyAddress}
                    onChange={(e) => setFormData(prev => ({ ...prev, propertyAddress: e.target.value }))}
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder="Enter property address"
                    required
                  ></textarea>
                </div>
              </div>
            </div>

            {/* Document Upload */}
            <div>
              <h2 className="text-xl font-semibold text-blue-600 mb-4">Required Documents</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-gray-700 mb-2" htmlFor="buildingPlan">
                    Building Plan
                  </label>
                  <input
                    type="file"
                    id="buildingPlan"
                    onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'buildingPlan')}
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    accept=".pdf,.jpg,.jpeg,.png"
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-700 mb-2" htmlFor="ownership">
                    Ownership Document
                  </label>
                  <input
                    type="file"
                    id="ownership"
                    onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'ownership')}
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    accept=".pdf,.jpg,.jpeg,.png"
                    required
                  />
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-700">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <div className="flex justify-center pt-4">
              <button
                type="submit"
                disabled={loading}
                className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Submitting...' : 'Submit Application'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

export default FireNOC 