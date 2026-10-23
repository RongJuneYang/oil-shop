import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { API_URL } from '../api';

const ORDER_STATUSES = [
  '待處理',
  '已確認',
  '運送中',
  '已完成',
  '已取消',
]

function AdminOrders() {
  const navigate = useNavigate()

  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deletingId, setDeletingId] = useState(null)
  const [updatingId, setUpdatingId] = useState(null)

  useEffect(() => {
    const token = localStorage.getItem('token')
    let member = null

    try {
      member = JSON.parse(
        localStorage.getItem('member') || 'null'
      )
    } catch {
      member = null
    }

    if (
      !token ||
      !member ||
      ![true, 1, 'true'].includes(member.is_admin)
    ) {
      navigate('/login', { replace: true })
      return
    }

    fetchOrders(token)
  }, [navigate])

  async function fetchOrders(token = localStorage.getItem('token')) {
    setLoading(true)
    setError('')

    try {
      const response = await fetch(
        `${API_URL}/orders/admin/all`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || '無法取得訂單')
      }

      setOrders(
        Array.isArray(data) ? data : data.orders || []
      )
    } catch (err) {
      setError(err.message || '載入訂單失敗')
    } finally {
      setLoading(false)
    }
  }

  async function updateOrderStatus(orderId, status) {
    const token = localStorage.getItem('token')

    setUpdatingId(orderId)
    setError('')

    try {
      const response = await fetch(
        `${API_URL}/orders/${orderId}/status`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status }),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data.message || '更新訂單狀態失敗'
        )
      }

      await fetchOrders(token)
    } catch (err) {
      setError(err.message || '更新訂單狀態失敗')
    } finally {
      setUpdatingId(null)
    }
  }

  async function deleteOrder(order) {
    const confirmed = window.confirm(
      `確定要刪除訂單 #${order.order_id} 嗎？\n\n` +
      '刪除後將無法從管理頁面還原，請確認後再繼續。'
    )

    if (!confirmed) return

    const token = localStorage.getItem('token')

    setDeletingId(order.order_id)
    setError('')

    try {
      const response = await fetch(
        `${API_URL}/orders/${order.order_id}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data.message || '刪除訂單失敗'
        )
      }

      setOrders((current) =>
        current.filter(
          (item) => item.order_id !== order.order_id
        )
      )
    } catch (err) {
      setError(err.message || '刪除訂單失敗')
    } finally {
      setDeletingId(null)
    }
  }

  function logout() {
    localStorage.removeItem('token')
    localStorage.removeItem('member')
    navigate('/login')
  }

  const navClass = 'text-amber-800 hover:underline'

  return (
    <main className="min-h-screen bg-amber-50">
      <header className="mb-8 border-b border-amber-200 bg-white px-6 py-5">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-amber-900">
            香珍麻油｜訂單管理
          </h1>

          <nav className="flex flex-wrap items-center gap-4">
            <Link to="/" className={navClass}>
              商品首頁
            </Link>

            <Link to="/admin/products" className={navClass}>
              商品管理
            </Link>

            <Link
              to="/admin/orders"
              className="font-semibold text-amber-900 underline"
            >
              訂單管理
            </Link>

            <Link to="/admin/members" className={navClass}>
              會員管理
            </Link>

            <button
              type="button"
              onClick={logout}
              className={navClass}
            >
              登出
            </button>
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 pb-10">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-stone-800">
              所有訂單
            </h2>
            <p className="mt-1 text-sm text-stone-500">
              目前共 {orders.length} 筆訂單
            </p>
          </div>

          <button
            type="button"
            onClick={() => fetchOrders()}
            disabled={loading}
            className="rounded-lg bg-amber-800 px-4 py-2 text-white hover:bg-amber-900 disabled:opacity-50"
          >
            {loading ? '載入中...' : '重新載入'}
          </button>
        </div>

        {error && (
          <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
            <p>{error}</p>
          </div>
        )}

        {loading && (
          <p className="py-6 text-stone-600">
            正在載入訂單……
          </p>
        )}

        {!loading && !error && orders.length === 0 && (
          <p className="rounded-xl border border-amber-200 bg-white p-6 text-center text-stone-600 shadow-sm">
            目前沒有訂單。
          </p>
        )}

        <div className="space-y-5">
          {orders.map((order) => (
            <section
              key={order.order_id}
              className="rounded-xl border border-amber-200 bg-white p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-amber-100 pb-4">
                <div>
                  <h3 className="text-lg font-bold text-amber-900">
                    訂單編號：{order.order_id}
                  </h3>

                  <p className="mt-2 text-sm text-stone-600">
                    會員：
                    {order.user_name ||
                      `會員編號 ${order.user_id}`}
                  </p>

                  <p className="mt-1 text-sm text-stone-600">
                    聯絡電話：{order.phone || '未提供'}
                  </p>

                  <p className="mt-1 text-sm text-stone-600">
                    建立時間：
                    {order.order_date
                      ? new Date(
                          order.order_date
                        ).toLocaleString('zh-TW')
                      : '未提供'}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <select
                    id={`status-${order.order_id}`}
                    defaultValue={order.status}
                    disabled={
                      updatingId === order.order_id ||
                      deletingId === order.order_id
                    }
                    className="rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm"
                  >
                    {ORDER_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    disabled={
                      updatingId === order.order_id ||
                      deletingId === order.order_id
                    }
                    onClick={() => {
                      const select = document.getElementById(
                        `status-${order.order_id}`
                      )

                      if (select) {
                        updateOrderStatus(
                          order.order_id,
                          select.value
                        )
                      }
                    }}
                    className="rounded-lg bg-amber-800 px-3 py-2 text-sm text-white hover:bg-amber-900 disabled:opacity-50"
                  >
                    {updatingId === order.order_id
                      ? '更新中...'
                      : '儲存狀態'}
                  </button>

                  <button
                    type="button"
                    disabled={
                      deletingId === order.order_id ||
                      updatingId === order.order_id
                    }
                    onClick={() => deleteOrder(order)}
                    className="rounded-lg bg-red-600 px-3 py-2 text-sm text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {deletingId === order.order_id
                      ? '刪除中...'
                      : '刪除訂單'}
                  </button>
                </div>
              </div>

              <p className="mt-4 text-sm text-stone-700">
                收件地址：{order.shipping_address || '未提供'}
              </p>

              <p className="mt-2 font-semibold text-amber-900">
                訂單總額：NT$ {
                  Number(order.total_amount || 0).toLocaleString('zh-TW')
                }
              </p>

              <div className="mt-5">
                <h4 className="mb-3 font-semibold text-stone-800">
                  商品明細
                </h4>

                {Array.isArray(order.items) &&
                order.items.length > 0 ? (
                  <div className="space-y-2">
                    {order.items.map((item, index) => (
                      <div
                        key={
                          item.order_item_id ||
                          item.product_id ||
                          index
                        }
                        className="flex flex-wrap justify-between gap-2 rounded-lg bg-amber-50 p-3 text-sm"
                      >
                        <span className="text-stone-700">
                          {item.product_name ||
                            `商品 ${item.product_id}`}
                          {' × '}
                          {item.quantity}
                        </span>

                        <span className="font-medium text-stone-800">
                          NT$ {
                            Number(
                              item.subtotal ??
                              Number(item.unit_price ?? item.price ?? 0) *
                                Number(item.quantity ?? 0)
                            ).toLocaleString('zh-TW')
                          }
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-stone-500">
                    尚未取得商品明細。
                  </p>
                )}
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  )
}

export default AdminOrders