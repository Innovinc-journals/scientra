import React, { useCallback, useEffect, useState } from 'react'
import { Plus, Search, Edit2, Trash2, X, User, Mail, Shield, RefreshCw } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { FormError, FormNotice } from '../../components/auth/AuthCard'
import { motion, AnimatePresence } from 'framer-motion'
import { api } from '../../api/apiClient'
import { toApiError } from '../../api/errors'

export default function AdminEmployees() {
  const [employees, setEmployees] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const pageSize = 20
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [newEmployee, setNewEmployee] = useState({ name: '', email: '', role: 'STAFF' })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [editingEmployee, setEditingEmployee] = useState(null)
  const [isUpdating, setIsUpdating] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.admin.listEmployees({
        q: searchTerm.trim() || undefined,
        page,
        page_size: pageSize,
      })
      setEmployees(res.items || [])
      setTotal(res.total ?? (res.items || []).length)
    } catch (err) {
      setError(toApiError(err).message)
    } finally {
      setLoading(false)
    }
  }, [searchTerm, page])

  useEffect(() => {
    load()
  }, [load])

  const handleAddEmployee = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError('')
    setNotice('')
    try {
      await api.admin.createEmployee({
        name: newEmployee.name.trim(),
        email: newEmployee.email.trim(),
        role: newEmployee.role,
      })
      setIsAddModalOpen(false)
      setNewEmployee({ name: '', email: '', role: 'STAFF' })
      setNotice('Invitation queued. The recipient will receive a Create Password email to activate their account.')
      await load()
    } catch (err) {
      setError(toApiError(err).message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdateEmployee = async (e) => {
    e.preventDefault()
    if (!editingEmployee) return
    setIsUpdating(true)
    setError('')
    setNotice('')
    try {
      await api.admin.updateEmployee(editingEmployee.id, {
        name: editingEmployee.name.trim(),
        role: editingEmployee.role,
        status: editingEmployee.status,
      })
      setEditingEmployee(null)
      setNotice('Employee record updated.')
      await load()
    } catch (err) {
      setError(toApiError(err).message)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDeactivate = async (emp) => {
    setError('')
    setNotice('')
    try {
      await api.admin.deactivateEmployee(emp.id)
      setNotice(`Deactivated ${emp.name || emp.email}.`)
      await load()
    } catch (err) {
      setError(toApiError(err).message)
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-navy-950">Manage Employees</h2>
          <p className="text-gray-500 text-sm mt-1">Invite and manage Staff, Editor, and Super Admin accounts.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" onClick={load} disabled={loading} className="gap-1.5">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
          <Button onClick={() => setIsAddModalOpen(true)} className="shadow-sm">
            <Plus className="w-4 h-4 mr-2" /> Invite Employee
          </Button>
        </div>
      </div>

      <FormError message={error} />
      <FormNotice message={notice} />

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
        {/* Toolbar */}
        <div className="p-6 border-b border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-96">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search employees..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                setPage(1)
              }}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-primary-500 outline-none text-sm font-medium transition-colors"
            />
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="p-16 flex justify-center">
            <div className="w-8 h-8 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                  <th className="px-6 py-4 font-semibold">Employee</th>
                  <th className="px-6 py-4 font-semibold">User ID</th>
                  <th className="px-6 py-4 font-semibold">Role</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {employees.map((emp) => {
                  const statusUpper = (emp.status || 'ACTIVE').toUpperCase()
                  return (
                    <tr key={emp.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-navy-950 text-sm">{emp.name}</span>
                          <span className="text-xs text-gray-500">{emp.email}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-gray-500">{emp.id}</td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-bold text-navy-900 bg-gray-100 px-2.5 py-1 rounded-md">
                          {emp.role}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${
                              statusUpper === 'ACTIVE'
                                ? 'bg-green-50 text-green-700 border-green-200'
                                : 'bg-gray-50 text-gray-600 border-gray-200'
                            }`}
                          >
                            {statusUpper}
                          </span>
                          {emp.email_verified === false && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                              Invite Pending
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() =>
                              setEditingEmployee({
                                id: emp.id,
                                name: emp.name || '',
                                role: emp.role || 'STAFF',
                                status: statusUpper,
                              })
                            }
                            className="h-8 w-8 p-0 border-gray-200 text-gray-600 hover:text-primary-600"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => handleDeactivate(emp)}
                            className="h-8 w-8 p-0 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
                            title="Deactivate"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {employees.length === 0 && (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                      No employees found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
            <span>
              Page {page} of {totalPages} ({total} total)
            </span>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Invite Employee Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-navy-950/40 backdrop-blur-sm"
              onClick={() => setIsAddModalOpen(false)}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100"
            >
              <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gray-50/50">
                <h3 className="text-xl font-bold text-navy-950">Invite Employee</h3>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddEmployee} className="p-6 space-y-5">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-navy-900">Full Name</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <User className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      required
                      minLength={2}
                      value={newEmployee.name}
                      onChange={(e) => setNewEmployee({ ...newEmployee, name: e.target.value })}
                      className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-primary-500 outline-none text-sm font-medium text-navy-900"
                      placeholder="e.g. Priya Rao"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-navy-900">Email Address</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="email"
                      required
                      value={newEmployee.email}
                      onChange={(e) => setNewEmployee({ ...newEmployee, email: e.target.value })}
                      className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-primary-500 outline-none text-sm font-medium text-navy-900"
                      placeholder="priya@scientrajournals.org"
                    />
                  </div>
                  <p className="text-[11px] text-gray-500">
                    Staff and Editors may use any valid email. SUPER_ADMIN invitations require an approved internal domain.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-navy-900">Role</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <Shield className="h-5 w-5 text-gray-400" />
                    </div>
                    <select
                      value={newEmployee.role}
                      onChange={(e) => setNewEmployee({ ...newEmployee, role: e.target.value })}
                      className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-primary-500 outline-none text-sm font-medium text-navy-900 appearance-none"
                    >
                      <option value="STAFF">STAFF</option>
                      <option value="EDITOR">EDITOR</option>
                      <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                    </select>
                  </div>
                </div>

                <div className="pt-4 flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full rounded-xl"
                    onClick={() => setIsAddModalOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" className="w-full rounded-xl" disabled={isSubmitting}>
                    {isSubmitting ? 'Sending Invite...' : 'Send Invite'}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* Edit Employee Modal */}
        {editingEmployee && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-navy-950/40 backdrop-blur-sm"
              onClick={() => setEditingEmployee(null)}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100"
            >
              <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gray-50/50">
                <h3 className="text-xl font-bold text-navy-950">Edit Employee</h3>
                <button
                  type="button"
                  onClick={() => setEditingEmployee(null)}
                  className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleUpdateEmployee} className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-navy-900">Full Name</label>
                  <input
                    type="text"
                    required
                    minLength={2}
                    value={editingEmployee.name}
                    onChange={(e) => setEditingEmployee({ ...editingEmployee, name: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm font-medium text-navy-900"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-navy-900">Role</label>
                  <select
                    value={editingEmployee.role}
                    onChange={(e) => setEditingEmployee({ ...editingEmployee, role: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm font-medium text-navy-900"
                  >
                    <option value="STAFF">STAFF</option>
                    <option value="EDITOR">EDITOR</option>
                    <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-navy-900">Status</label>
                  <select
                    value={editingEmployee.status}
                    onChange={(e) => setEditingEmployee({ ...editingEmployee, status: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm font-medium text-navy-900"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </div>

                <div className="pt-4 flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full rounded-xl"
                    onClick={() => setEditingEmployee(null)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" className="w-full rounded-xl" disabled={isUpdating}>
                    {isUpdating ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
