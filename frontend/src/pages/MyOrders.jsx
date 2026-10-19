import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { API_URL } from '../api';

function MyOrders() {
  const navigate = useNavigate()
  const [orders, setOrders] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const member = JSON.parse(localStorage.getItem('member') || 'null')
  const isAdmin = member?.is_admin === true

  useEffect(() => {
    const token = localStorage.getItem('token')

    if (!token) {
      navigate('/login')
      return
    }

    fetch(`${API_URL}/orders`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then(async (response) => {
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.message || '無法取得訂單')
        }

        return data
      })
      .then((data) => {
        setOrders(Array.isArray(data) ? data : data.orders || [])
      })
      .catch((err) => {
        setError(err.message || '載入訂單失敗')
      })
      .finally(() => {
        setLoading(false)
      })
  }, [navigate])

  function logout() {
    localStorage.removeItem('token')
    localStorage.removeItem('member')
    navigate('/login')
  }

  function getStatusStyle(status) {
    switch (status) {
      case '已完成':
        return 'bg-green-100 text-green-700'
      case '已取消':
        return 'bg-red-100 text-red-700'
      case '運送中':
        return 'bg-blue-100 text-blue-700'
      case '已確認':
        return 'bg-amber-100 text-amber-800'
      default:
        return 'bg-stone-100 text-stone-700'
    }
  }

  return (
    <div className="min-h-screen bg-amber-50/40">
      <header className="border-b border-amber-100 bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <Link
            to="/"
            className="text-xl font-bold tracking-wide text-amber-900"
          >
            麻油商店
          </Link>

          <nav className="flex flex-wrap items-center gap-x-5 gap-y-3 text-sm font-medium">
            <Link
              to="/"
              className="text-amber-800 transition hover:text-amber-600 hover:underline"
            >
              首頁
            </Link>

            <Link
              to="/my-orders"
              className="text-amber-800 transition hover:text-amber-600 hover:underline"
            >
              我的訂單
            </Link>

            {isAdmin && (
              <>
                <Link
                  to="/admin/products"
                  className="text-amber-800 transition hover:text-amber-600 hover:underline"
                >
                  商品管理
                </Link>

                <Link
                  to="/admin/orders"
                  className="text-amber-800 transition hover:text-amber-600 hover:underline"
                >
                  訂單管理
                </Link>

                <Link
                  to="/admin/members"
                  className="text-amber-800 transition hover:text-amber-600 hover:underline"
                >
                  會員管理
                </Link>
              </>
            )}

            <button
              onClick={logout}
              className="rounded-lg bg-amber-800 px-4 py-2 text-white transition hover:bg-amber-900"
            >
              登出
            </button>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-stone-800">
            我的訂單
          </h1>
          <p className="mt-2 text-sm text-stone-500">
            查看您的訂單紀錄、商品明細與配送狀態。
          </p>
        </div>

        {loading && (
          <div className="rounded-xl border border-amber-100 bg-white p-8 text-center text-stone-500 shadow-sm">
            正在載入訂單...
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
            {error}
          </div>
        )}

        {!loading && !error && orders.length === 0 && (
          <div className="rounded-xl border border-amber-100 bg-white px-6 py-14 text-center shadow-sm">
            <h2 className="text-lg font-semibold text-stone-700">
              目前沒有訂單紀錄
            </h2>
            <p className="mt-2 text-sm text-stone-500">
              前往商品列表，挑選您需要的商品。
            </p>
            <Link
              to="/"
              className="mt-5 inline-block rounded-lg bg-amber-800 px-5 py-2.5 font-medium text-white transition hover:bg-amber-900"
            >
              前往購物
            </Link>
          </div>
        )}

        {!loading && !error && orders.length > 0 && (
          <div className="space-y-6">
            {orders.map((order) => (
              <section
                key={order.order_id}
                className="overflow-hidden rounded-xl border border-amber-100 bg-white shadow-sm transition hover:shadow-md"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-100 bg-amber-50/70 px-5 py-4">
                  <div>
                    <p className="text-xs font-medium text-stone-500">
                      訂單編號
                    </p>
                    <h2 className="mt-1 text-lg font-bold text-stone-800">
                      #{order.order_id}
                    </h2>
                  </div>

                  <span
                    className={`rounded-full px-3 py-1 text-sm font-semibold ${getStatusStyle(order.status)}`}
                  >
                    {order.status || '處理中'}
                  </span>
                </div>

                <div className="space-y-5 p-5">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <p className="text-sm text-stone-500">訂單時間</p>
                      <p className="mt-1 text-stone-800">
                        {order.order_date
                          ? new Date(order.order_date).toLocaleString('zh-TW')
                          : '未提供'}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm text-stone-500">收件地址</p>
                      <p className="mt-1 break-words text-stone-800">
                        {order.shipping_address || '未提供'}
                      </p>
                    </div>
                  </div>

                  <div>
                    <h3 className="mb-3 border-b border-stone-100 pb-2 font-semibold text-stone-800">
                      商品明細
                    </h3>

                    {Array.isArray(order.items) && order.items.length > 0 ? (
                      <div className="space-y-2">
                        {order.items.map((item, index) => (
                          <div
                            key={`${order.order_id}-${item.product_id}-${index}`}
                            className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-stone-50 px-4 py-3"
                          >
                            <div>
                              <p className="font-medium text-stone-800">
                                {item.product_name ||
                                  `商品 ${item.product_id}`}
                              </p>
                              <p className="mt-1 text-sm text-stone-500">
                                數量：{item.quantity}
                              </p>
                            </div>

                            <p className="text-sm text-stone-600">
                              單價：NT$ {Number(item.unit_price).toLocaleString()}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="rounded-lg bg-stone-50 p-4 text-sm text-stone-500">
                        沒有商品明細。
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-amber-100 pt-4">
                    <span className="text-sm text-stone-500">
                      訂單總金額
                    </span>
                    <span className="text-xl font-bold text-amber-900">
                      NT$ {Number(order.total_amount).toLocaleString()}
                    </span>
                  </div>
                </div>
              </section>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

export default MyOrders