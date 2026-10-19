
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { API_URL } from '../api';

function AdminMembers() {
  const navigate = useNavigate()

  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState(null)

  const [form, setForm] = useState({
    user_name: '',
    phone: '',
    is_admin: false,
  })

  useEffect(() => {
    const token = localStorage.getItem('token')
    const savedMember = localStorage.getItem('member')

    if (!token || !savedMember) {
      navigate('/login')
      return
    }

    try {
      const member = JSON.parse(savedMember)
      const isAdmin =
        member.is_admin === true ||
        member.is_admin === 1 ||
        member.is_admin === 'true'

      if (!isAdmin) {
        navigate('/')
        return
      }
    } catch {
      navigate('/login')
      return
    }

    async function fetchMembers() {
      try {
        const response = await fetch(`${API_URL}/members/admin/all`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.message || '無法取得會員資料')
        }

        setMembers(data.members || [])
      } catch (err) {
        setError(err.message || '載入會員資料失敗')
      } finally {
        setLoading(false)
      }
    }

    fetchMembers()
  }, [navigate])

  function startEdit(member) {
    setEditingId(member.user_id)
    setForm({
      user_name: member.user_name || '',
      phone: member.phone || '',
      is_admin:
        member.is_admin === true ||
        member.is_admin === 1 ||
        member.is_admin === 'true',
    })
    setError('')
    setNotice('')
  }

  function cancelEdit() {
    setEditingId(null)
    setForm({
      user_name: '',
      phone: '',
      is_admin: false,
    })
  }

  async function saveMember(userId) {
    const token = localStorage.getItem('token')

    if (!form.user_name.trim() || !form.phone.trim()) {
      setError('姓名與電話不可空白')
      return
    }

    setSaving(true)
    setError('')
    setNotice('')

    try {
      const response = await fetch(`${API_URL}/members/admin/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          user_name: form.user_name.trim(),
          phone: form.phone.trim(),
          is_admin: form.is_admin,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || '更新會員失敗')
      }

      setMembers((previous) =>
        previous.map((member) =>
          member.user_id === userId ? data.member : member
        )
      )

      cancelEdit()
      setNotice('會員資料更新成功')
    } catch (err) {
      setError(err.message || '更新會員失敗')
    } finally {
      setSaving(false)
    }
  }

  async function deleteMember(member) {
    const currentMember = JSON.parse(
      localStorage.getItem('member') || 'null'
    )

    if (Number(currentMember?.user_id) === Number(member.user_id)) {
      setError('不能刪除目前登入的管理員帳號')
      return
    }

    const isAdmin =
      member.is_admin === true ||
      member.is_admin === 1 ||
      member.is_admin === 'true'

    if (isAdmin) {
      setError('此功能不允許刪除管理員帳號')
      return
    }

    const confirmed = window.confirm(
      `確定要刪除會員「${member.user_name}」嗎？\n\n若此會員已有訂單，系統會拒絕刪除，以保留交易紀錄。`
    )

    if (!confirmed) return

    const token = localStorage.getItem('token')

    setDeletingId(member.user_id)
    setError('')
    setNotice('')

    try {
      const response = await fetch(
        `${API_URL}/members/admin/${member.user_id}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || '刪除會員失敗')
      }

      setMembers((previous) =>
        previous.filter(
          (item) => item.user_id !== member.user_id
        )
      )

      if (editingId === member.user_id) {
        cancelEdit()
      }

      setNotice(`會員「${member.user_name}」已刪除`)
    } catch (err) {
      setError(err.message || '刪除會員失敗')
    } finally {
      setDeletingId(null)
    }
  }

  function logout() {
    localStorage.removeItem('token')
    localStorage.removeItem('member')
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-[#faf8f3] text-stone-800">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-5">
          <Link to="/" className="text-xl font-bold text-amber-900">
            香珍麻油
          </Link>

          <nav className="flex flex-wrap items-center gap-4 text-sm">
            <Link to="/" className="text-amber-800 hover:underline">
              回首頁
            </Link>
            <Link
              to="/admin/products"
              className="text-amber-800 hover:underline"
            >
              商品管理
            </Link>
            <Link
              to="/admin/orders"
              className="text-amber-800 hover:underline"
            >
              訂單管理
            </Link>
            <span className="font-semibold text-amber-900">
              會員管理
            </span>
            <button
              onClick={logout}
              className="text-amber-800 hover:underline"
            >
              登出
            </button>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-12">
        <h1 className="text-3xl font-bold text-amber-900">
          會員管理
        </h1>

        <p className="mt-3 mb-6 text-stone-600">
          目前共有 {members.length} 位會員
        </p>

        {error && (
          <div className="mb-5 rounded-xl bg-red-50 p-4 text-red-700">
            {error}
          </div>
        )}

        {notice && (
          <div className="mb-5 rounded-xl bg-green-50 p-4 text-green-800">
            {notice}
          </div>
        )}

        {loading ? (
          <p className="py-8 text-stone-500">
            正在載入會員資料……
          </p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white shadow-sm">
            <table className="w-full min-w-[850px] text-left">
              <thead className="bg-amber-100 text-stone-800">
                <tr>
                  <th className="px-5 py-4">會員編號</th>
                  <th className="px-5 py-4">會員姓名</th>
                  <th className="px-5 py-4">電話</th>
                  <th className="px-5 py-4">權限</th>
                  <th className="px-5 py-4">操作</th>
                </tr>
              </thead>

              <tbody>
                {members.map((member) => {
                  const editing = editingId === member.user_id
                  const isAdmin =
                    member.is_admin === true ||
                    member.is_admin === 1 ||
                    member.is_admin === 'true'

                  const currentMember = JSON.parse(
                    localStorage.getItem('member') || 'null'
                  )

                  const isCurrentMember =
                    Number(currentMember?.user_id) ===
                    Number(member.user_id)

                  return (
                    <tr
                      key={member.user_id}
                      className="border-t border-stone-200 hover:bg-stone-50"
                    >
                      <td className="px-5 py-4">
                        {member.user_id}
                      </td>

                      <td className="px-5 py-4">
                        {editing ? (
                          <input
                            value={form.user_name}
                            onChange={(event) =>
                              setForm({
                                ...form,
                                user_name: event.target.value,
                              })
                            }
                            className="w-40 rounded-lg border border-stone-300 px-3 py-2"
                          />
                        ) : (
                          member.user_name
                        )}
                      </td>

                      <td className="px-5 py-4">
                        {editing ? (
                          <input
                            value={form.phone}
                            onChange={(event) =>
                              setForm({
                                ...form,
                                phone: event.target.value,
                              })
                            }
                            className="w-40 rounded-lg border border-stone-300 px-3 py-2"
                          />
                        ) : (
                          member.phone
                        )}
                      </td>

                      <td className="px-5 py-4">
                        {editing ? (
                          <select
                            value={form.is_admin ? 'true' : 'false'}
                            onChange={(event) =>
                              setForm({
                                ...form,
                                is_admin: event.target.value === 'true',
                              })
                            }
                            className="rounded-lg border border-stone-300 px-3 py-2"
                          >
                            <option value="false">一般會員</option>
                            <option value="true">管理員</option>
                          </select>
                        ) : (
                          <span
                            className={`rounded-full px-3 py-1 text-sm ${
                              isAdmin
                                ? 'bg-amber-100 text-amber-900'
                                : 'bg-stone-100 text-stone-700'
                            }`}
                          >
                            {isAdmin ? '管理員' : '一般會員'}
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        {editing ? (
                          <div className="flex gap-2">
                            <button
                              onClick={() => saveMember(member.user_id)}
                              disabled={saving}
                              className="rounded-lg bg-amber-800 px-3 py-2 text-white hover:bg-amber-900 disabled:opacity-50"
                            >
                              {saving ? '儲存中…' : '儲存'}
                            </button>

                            <button
                              onClick={cancelEdit}
                              disabled={saving}
                              className="rounded-lg border border-stone-300 px-3 py-2 hover:bg-stone-100"
                            >
                              取消
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => startEdit(member)}
                              className="rounded-lg bg-amber-800 px-3 py-2 text-white hover:bg-amber-900"
                            >
                              編輯
                            </button>

                            <button
                              onClick={() => deleteMember(member)}
                              disabled={
                                deletingId !== null ||
                                isAdmin ||
                                isCurrentMember
                              }
                              title={
                                isCurrentMember
                                  ? '不能刪除目前登入的帳號'
                                  : isAdmin
                                    ? '不能刪除管理員帳號'
                                    : '刪除會員'
                              }
                              className="rounded-lg bg-red-700 px-3 py-2 text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              {deletingId === member.user_id
                                ? '刪除中…'
                                : '刪除'}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}

                {members.length === 0 && (
                  <tr>
                    <td
                      colSpan="5"
                      className="px-5 py-8 text-center text-stone-500"
                    >
                      目前沒有會員資料
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  )
}

export default AdminMembers
