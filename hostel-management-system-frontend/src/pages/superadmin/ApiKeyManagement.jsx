import { useState, useEffect } from "react"
import { FaKey, FaPlus, FaTrash, FaCopy, FaCheckCircle } from "react-icons/fa"
import SearchBar from "../../components/common/SearchBar"
import FilterTabs from "../../components/common/FilterTabs"
import NoResults from "../../components/common/NoResults"
import BaseTable from "../../components/common/table/BaseTable"
import Modal from "../../components/common/Modal"
import superAdminService from "../../services/superAdminService"

const API_KEY_FILTER_TABS = [
  { value: "all", label: "All", count: 0 },
  { value: "active", label: "active", count: 0 },
  { value: "inactive", label: "inactive", count: 0 },
]

const ApiKeyManagement = () => {
  const [apiKeys, setApiKeys] = useState([])
  const [filteredApiKeys, setFilteredApiKeys] = useState([])
  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState("all")
  const [showAddModal, setShowAddModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [filterTabs, setFilterTabs] = useState(API_KEY_FILTER_TABS)
  const [copiedId, setCopiedId] = useState(null)
  const [error, setError] = useState(null)

  const fetchApiKeys = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await superAdminService.getAllApiKeys()
      const apiKeysData = data || []
      setApiKeys(apiKeysData)

      const updatedTabs = API_KEY_FILTER_TABS.map((tab) => {
        if (tab.id === "all") return { ...tab, count: apiKeysData.length }
        if (tab.id === "active") return { ...tab, count: apiKeysData.filter((k) => k.isActive).length }
        if (tab.id === "inactive") return { ...tab, count: apiKeysData.filter((k) => !k.isActive).length }
        return tab
      })
      setFilterTabs(updatedTabs)
    } catch (err) {
      console.error("Error fetching API keys:", err)
      setError(err.message || "Failed to load API keys")
      window.alert("Failed to load API keys")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchApiKeys()
  }, [])

  useEffect(() => {
    if (!apiKeys.length) return

    let filtered = [...apiKeys]

    if (filterStatus === "active") {
      filtered = filtered.filter((key) => key.isActive)
    } else if (filterStatus === "inactive") {
      filtered = filtered.filter((key) => !key.isActive)
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter((key) => key.name.toLowerCase().includes(term))
    }

    setFilteredApiKeys(filtered)
  }, [apiKeys, searchTerm, filterStatus])

  const handleAddApiKey = async (keyData) => {
    try {
      setLoading(true)
      const response = await superAdminService.createApiKey(keyData)

      window.alert(`New API key created successfully!\n\nAPI KEY: ${response.apiKey}`)

      try {
        navigator.clipboard.writeText(response.apiKey)
      } catch (clipboardErr) {
        console.error("Could not copy to clipboard:", clipboardErr)
      }

      fetchApiKeys()
      setShowAddModal(false)
    } catch (err) {
      console.error("Error adding API key:", err)
      window.alert(err.message || "Failed to create API key")
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteApiKey = async (id) => {
    const confirmDelete = window.confirm("Are you sure you want to delete this API key?")
    if (!confirmDelete) return

    try {
      setLoading(true)
      await superAdminService.deleteApiKey(id)
      window.alert("API key deleted successfully")
      fetchApiKeys()
    } catch (err) {
      console.error("Error deleting API key:", err)
      window.alert(err.message || "Failed to delete API key")
    } finally {
      setLoading(false)
    }
  }

  const handleToggleStatus = async (id, currentStatus) => {
    try {
      setLoading(true)
      await superAdminService.updateApiKeyStatus(id, !currentStatus)
      window.alert(`API key ${currentStatus ? "deactivated" : "activated"} successfully`)
      fetchApiKeys()
    } catch (err) {
      console.error("Error updating API key status:", err)
      window.alert(err.message || "Failed to update API key status")
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id)
      window.alert("API key copied to clipboard")
      setTimeout(() => setCopiedId(null), 2000)
    })
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
  }

  const columns = [
    {
      header: "Name",
      key: "name",
      render: (apiKey) => (
        <div className="flex items-center">
          <div className="h-10 w-10 flex-shrink-0 bg-purple-100 rounded-full flex items-center justify-center">
            <FaKey className="h-5 w-5 text-purple-600" />
          </div>
          <div className="ml-4">
            <div className="text-sm font-medium text-gray-900">{apiKey.name}</div>
          </div>
        </div>
      ),
    },
    {
      header: "API Key",
      key: "apiKey",
      render: (apiKey) => (
        <div className="flex items-center">
          <div className="text-sm text-gray-500 font-mono">
            {apiKey.apiKey
              ? // For existing keys, we'll likely only have a masked version from the backend
                `${apiKey.apiKey.substring(0, 8)}...${apiKey.apiKey.substring(apiKey.apiKey.length - 8)}`
              : "************"}
          </div>
          {apiKey.apiKey && (
            <button onClick={() => copyToClipboard(apiKey.apiKey, apiKey._id)} className="ml-2 text-gray-400 hover:text-gray-600">
              {copiedId === apiKey._id ? <FaCheckCircle className="text-green-500" /> : <FaCopy />}
            </button>
          )}
        </div>
      ),
    },
    {
      header: "Status",
      key: "status",
      render: (apiKey) => <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${apiKey.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>{apiKey.isActive ? "Active" : "Inactive"}</span>,
    },
    {
      header: "Created",
      key: "createdAt",
      render: (apiKey) => <div className="text-sm text-gray-500">{formatDate(apiKey.createdAt)}</div>,
    },
    {
      header: "Actions",
      key: "actions",
      align: "right",
      render: (apiKey) => (
        <div className="flex justify-end space-x-2">
          <button
            onClick={() => handleToggleStatus(apiKey._id, apiKey.isActive)}
            className={`inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded ${apiKey.isActive ? "text-red-700 bg-red-100 hover:bg-red-200" : "text-green-700 bg-green-100 hover:bg-green-200"}`}
          >
            {apiKey.isActive ? "Deactivate" : "Activate"}
          </button>
          <button onClick={() => handleDeleteApiKey(apiKey._id)} className="text-red-600 hover:text-red-900 p-2 hover:bg-red-50 rounded-full transition-colors">
            <FaTrash />
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 flex-1">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center w-full mb-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-4 sm:mb-0">API Key Management</h1>
        <button onClick={() => setShowAddModal(true)} className="bg-[#1360AB] text-white flex items-center px-4 py-2.5 rounded-xl hover:bg-[#0F4C81] transition-all duration-300 shadow-sm hover:shadow-md">
          <FaPlus className="mr-2" /> Generate API Key
        </button>
      </header>

      <div className="bg-white rounded-xl shadow-md p-6 mb-6">
        <div className="text-gray-600 mb-4">API keys are used for authenticating external applications that integrate with your system. These keys should be kept secure and can be activated or deactivated as needed.</div>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
          <div className="w-full sm:w-auto overflow-x-auto pb-2">
            <FilterTabs tabs={filterTabs} activeTab={filterStatus} setActiveTab={setFilterStatus} />
          </div>
          <SearchBar value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search API keys by name" className="w-full sm:w-64 md:w-72" />
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {loading && apiKeys.length === 0 ? (
        <div className="text-center py-10">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mb-4"></div>
          <p className="text-gray-600">Loading API keys...</p>
        </div>
      ) : filteredApiKeys.length === 0 ? (
        <NoResults icon={<FaKey className="text-gray-300 text-3xl" />} message="No API keys found" suggestion="Try changing your search or filter criteria" />
      ) : (
        <BaseTable columns={columns} data={filteredApiKeys} emptyMessage="No API keys found" isLoading={loading} />
      )}

      {/* Add API Key Modal */}
      {showAddModal && <ApiKeyModal onClose={() => setShowAddModal(false)} onSubmit={handleAddApiKey} />}
    </div>
  )
}

// API Key Modal Component for Add
const ApiKeyModal = ({ onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    name: "",
  })

  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const validate = () => {
    const newErrors = {}
    if (!formData.name.trim()) newErrors.name = "Name is required"
    return newErrors
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const newErrors = validate()

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setIsSubmitting(true)
    try {
      await onSubmit(formData)
    } catch (err) {
      console.error("Form submission error:", err)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal title="Generate New API Key" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="bg-purple-50 p-4 rounded-lg mb-4">
          <div className="flex items-center text-purple-800">
            <FaKey className="mr-2" />
            <h4 className="font-medium">API Key Information</h4>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              API Key Name *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g., Mobile App Integration"
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${errors.name ? "border-red-300" : "border-gray-300"}`}
            />
            {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
          </div>
        </div>

        <div className="mt-6 flex justify-end space-x-3">
          <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#1360AB] hover:bg-[#0F4C81] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${isSubmitting ? "opacity-75 cursor-not-allowed" : ""}`}
          >
            {isSubmitting ? "Processing..." : "Generate"}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default ApiKeyManagement
