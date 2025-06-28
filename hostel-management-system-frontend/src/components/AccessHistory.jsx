import { useState, useEffect } from "react"
import { FaHistory, FaFilter, FaSignInAlt, FaSignOutAlt, FaCalendarAlt, FaClock } from "react-icons/fa"
import FilterTabs from "./common/FilterTabs"
import NoResults from "./common/NoResults"
import Pagination from "./common/Pagination"
import { securityApi } from "../services/apiService"
import { useAuth } from "../contexts/AuthProvider"

const ENTRY_FILTER_TABS = [
  { label: "All", value: "all" },
  { label: "Checked In", value: "Checked In" },
  { label: "Checked Out", value: "Checked Out" },
]

const AccessHistory = ({ cachedData }) => {
  const { isOnline } = useAuth()
  const [filterStatus, setFilterStatus] = useState("all")
  const [filterDate, setFilterDate] = useState("")
  const [showFilters, setShowFilters] = useState(false)
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [totalItems, setTotalItems] = useState(0)

  const fetchEntries = async () => {
    try {
      setLoading(true)

      // If we have cached data and we're offline, use it
      if (cachedData && !isOnline) {
        processCachedData(cachedData)
        return
      }

      const queryParams = {
        status: filterStatus !== "all" ? filterStatus : undefined,
        date: filterDate || undefined,
        page: currentPage,
        limit: itemsPerPage,
      }

      const filteredParams = Object.fromEntries(Object.entries(queryParams).filter(([_, v]) => v !== undefined))

      const response = await securityApi.getStudentEntries(filteredParams)
      setEntries(response.studentEntries || [])

      if (response.meta) {
        setTotalItems(response.meta.total || 0)
        setTotalPages(response.meta.totalPages || 1)
      }
    } catch (error) {
      console.error("Error fetching student entries:", error)

      // If we have cached data and the API call fails, use it
      if (cachedData) {
        processCachedData(cachedData)
      }
    } finally {
      setLoading(false)
    }
  }

  // Helper function to process cached data with filters
  const processCachedData = (data) => {
    let filteredEntries = data.studentEntries || []

    // Apply status filter
    if (filterStatus !== "all") {
      filteredEntries = filteredEntries.filter((entry) => entry.status === filterStatus)
    }

    // Apply date filter
    if (filterDate) {
      const filterDateObj = new Date(filterDate)
      filteredEntries = filteredEntries.filter((entry) => {
        const entryDate = new Date(entry.dateAndTime)
        return entryDate.toDateString() === filterDateObj.toDateString()
      })
    }

    // Apply pagination
    const startIndex = (currentPage - 1) * itemsPerPage
    const paginatedEntries = filteredEntries.slice(startIndex, startIndex + itemsPerPage)

    setEntries(paginatedEntries)
    setTotalItems(filteredEntries.length)
    setTotalPages(Math.ceil(filteredEntries.length / itemsPerPage))
  }

  useEffect(() => {
    const debounceTimeout = setTimeout(() => {
      fetchEntries()
    }, 500)

    return () => clearTimeout(debounceTimeout)
  }, [filterStatus, filterDate, currentPage, itemsPerPage, cachedData, isOnline])

  const handleFilterStatusChange = (status) => {
    setFilterStatus(status)
    setCurrentPage(1)
  }

  const handleDateFilterChange = (e) => {
    setFilterDate(e.target.value)
    setCurrentPage(1)
  }

  const handleClearDateFilter = () => {
    setFilterDate("")
  }

  const paginate = (pageNumber) => {
    setCurrentPage(pageNumber)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const handleItemsPerPageChange = (e) => {
    setItemsPerPage(Number(e.target.value))
    setCurrentPage(1)
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const formatTime = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <div className="lg:col-span-2">
      <div className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-300 border border-gray-100 h-full">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <div className="p-2.5 mr-3 rounded-xl bg-blue-100 text-[#1360AB]">
              <FaHistory size={20} />
            </div>
            <h2 className="text-xl font-bold text-gray-800">Access History</h2>
          </div>
          <button onClick={() => setShowFilters(!showFilters)} className={`flex items-center px-3 py-2 rounded-xl ${showFilters ? "bg-[#1360AB] text-white" : "bg-white text-gray-700 border border-gray-200"}`} disabled={!isOnline && !cachedData}>
            <FaFilter className="mr-2" /> Filters
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="mb-5">
          <FilterTabs tabs={ENTRY_FILTER_TABS} activeTab={filterStatus} setActiveTab={handleFilterStatusChange} disabled={!isOnline && !cachedData} />
        </div>

        {/* Additional Filters */}
        {showFilters && (
          <div className="bg-gray-50 p-4 rounded-xl mb-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Filter by Date</label>
                <input type="date" value={filterDate} onChange={handleDateFilterChange} className="w-full p-2 border border-gray-300 rounded-lg" />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Items Per Page</label>
                <select value={itemsPerPage} onChange={handleItemsPerPageChange} className="w-full p-2 border border-gray-300 rounded-lg">
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>
              <div className="flex items-end">
                <button onClick={handleClearDateFilter} className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200">
                  Clear Date Filter
                </button>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="relative w-16 h-16">
              <div className="absolute top-0 left-0 w-full h-full border-4 border-gray-200 rounded-full"></div>
              <div className="absolute top-0 left-0 w-full h-full border-4 border-[#1360AB] rounded-full animate-spin border-t-transparent"></div>
            </div>
          </div>
        ) : entries.length === 0 ? (
          <NoResults
            icon={<FaHistory className="text-gray-300 text-5xl" />}
            message={!isOnline && !cachedData ? "No data available while offline" : "No entry records found"}
            suggestion={!isOnline && !cachedData ? "Connect to the internet to view your access history" : "Try changing your filter criteria"}
          />
        ) : (
          <>
            {/* Table View for Larger Screens */}
            <div className="hidden lg:block overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Time
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {entries.map((entry) => (
                      <tr key={entry._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className={`p-1.5 rounded-md ${entry.status === "Checked In" ? "bg-green-100" : "bg-blue-100"} mr-2`}>{entry.status === "Checked In" ? <FaSignInAlt className="text-green-600 text-sm" /> : <FaSignOutAlt className="text-blue-600 text-sm" />}</div>
                            <span className="text-sm font-medium text-gray-700">{entry.status}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center text-sm text-gray-700">
                            <FaCalendarAlt className="text-gray-400 mr-2 text-xs" />
                            {formatDate(entry.dateAndTime)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center text-sm text-gray-700">
                            <FaClock className="text-gray-400 mr-2 text-xs" />
                            {formatTime(entry.dateAndTime)}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile View for Entries */}
            <div className="lg:hidden space-y-3">
              {entries.map((entry) => (
                <div key={entry._id} className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center">
                      <div className={`p-1.5 rounded-md ${entry.status === "Checked In" ? "bg-green-100" : "bg-blue-100"} mr-2`}>{entry.status === "Checked In" ? <FaSignInAlt className="text-green-600 text-sm" /> : <FaSignOutAlt className="text-blue-600 text-sm" />}</div>
                      <span className="text-sm font-medium text-gray-700">{entry.status}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <div className="flex items-center">
                      <FaCalendarAlt className="mr-1" />
                      {formatDate(entry.dateAndTime)}
                    </div>
                    <div className="flex items-center">
                      <FaClock className="mr-1" />
                      {formatTime(entry.dateAndTime)}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-6">
                <Pagination currentPage={currentPage} totalPages={totalPages} paginate={paginate} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default AccessHistory
