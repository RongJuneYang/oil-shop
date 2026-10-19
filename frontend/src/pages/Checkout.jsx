import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { API_URL } from '../api';

function Checkout() {
  const navigate = useNavigate()

  const [products, setProducts] = useState([])
  const [quantities, setQuantities] = useState({})
  const [shippingAddress, setShippingAddress] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const token = localStorage.getItem('token') || ''
  const member = JSON.parse(localStorage.getItem('member') || 'null')

  useEffect(() => {
    async function loadProducts() {
      try {
        const response = await fetch(`${API_URL}/products`)

        if (!response.ok) {
          throw new Error('無法取得商品資料')
        }

        const data = await response.json()
        const list = Array.isArray(data) ? data : data.products

        if (!Array.isArray(list)) {
          throw new Error('商品資料格式不正確')
        }

        setProducts(list)
      } catch (err) {
        setError(err.message || '載入商品失敗')
      } finally {
        setLoading(false)
      }
    }

    loadProducts()
  }, [])

  const selectedItems = products
    .map((product) => ({
      product_id: product.product_id,
      product_name: product.product_name,
      price: Number(product.price),
      quantity: Number(quantities[product.product_id] || 0),
      stock: Number(product.stock_quantity),
    }))
    .filter((item) => item.quantity > 0)

  const estimatedTotal = selectedItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  )

  function updateQuantity(productId, value) {
    const quantity =
      value === '' ? '' : Math.max(0, Number(value) || 0)

    setQuantities((previous) => ({
      ...previous,
      [productId]: quantity,
    }))
  }

  async function submitOrder(event) {
    event.preventDefault()
    setError('')
    setMessage('')

    if (!token || !member) {
      navigate('/login')
      return
    }

    if (member.is_admin) {
      setError('管理員帳號不能透過會員結帳頁面建立訂單。')
      return
    }

    if (!shippingAddress.trim()) {
      setError('請輸入收件地址。')
      return
    }

    if (selectedItems.length === 0) {
      setError('請至少選擇一項商品並輸入數量。')
      return
    }

    const invalidItem = selectedItems.find(
      (item) =>
        !Number.isSafeInteger(item.quantity) ||
        item.quantity <= 0 ||
        item.quantity > item.stock,
    )

    if (invalidItem) {
      setError(`「${invalidItem.product_name}」的訂購數量不正確或超過庫存。`)
      return
    }

    setSubmitting(true)

    try {
      const response = await fetch(`${API_URL}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          shipping_address: shippingAddress.trim(),
          items: selectedItems.map((item) => ({
            product_id: item.product_id,
            quantity: item.quantity,
          })),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          localStorage.removeItem('token')
          localStorage.removeItem('member')
          navigate('/login')
          return
        }

        throw new Error(data.message || '訂單送出失敗')
      }

      setMessage(`訂單建立成功！訂單編號：${data.order.order_id}`)
      setQuantities({})
      setShippingAddress('')

      const refresh = await fetch(`${API_URL}/products`)
      if (refresh.ok) {
        const refreshedData = await refresh.json()
        const list = Array.isArray(refreshedData)
          ? refreshedData
          : refreshedData.products

        if (Array.isArray(list)) {
          setProducts(list)
        }
      }
    } catch (err) {
      setError(err.message || '送出訂單時發生錯誤')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#faf8f3] text-stone-800">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-5">
          <Link to="/" className="text-xl font-bold text-amber-900">
            香珍麻油
          </Link>

          <nav className="flex flex-wrap items-center gap-4 text-sm">
            <span>你好，{member?.user_name || '訪客'}</span>
            <Link to="/products" className="text-amber-800 hover:underline">
              瀏覽商品
            </Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-6 py-12">
        <h1 className="text-3xl font-bold text-amber-900">建立訂單</h1>
        <p className="mt-3 text-stone-600">
          選擇商品數量並填寫收件地址，確認後即可送出。
        </p>

        {loading ? (
          <p className="py-10 text-stone-500">正在載入商品……</p>
        ) : error && products.length === 0 ? (
          <p role="alert" className="mt-6 rounded-xl bg-red-50 p-4 text-red-700">
            {error}
          </p>
        ) : (
          <form onSubmit={submitOrder} className="mt-8 space-y-8">
            <section className="rounded-2xl border border-stone-200 bg-white p-6">
              <h2 className="text-xl font-bold">選擇商品</h2>

              <div className="mt-5 divide-y divide-stone-200">
                {products.map((product) => {
                  const id = product.product_id
                  const stock = Number(product.stock_quantity)

                  return (
                    <div
                      key={id}
                      className="flex flex-wrap items-center justify-between gap-4 py-5"
                    >
                      <div>
                        <h3 className="font-semibold">{product.product_name}</h3>
                        <p className="mt-1 text-sm text-stone-500">
                          NT$ {Number(product.price).toLocaleString('zh-TW')}
                          {' · '}庫存：{stock}
                        </p>
                      </div>

                      <label className="w-28 text-sm">
                        數量
                        <input
                          type="number"
                          min="0"
                          max={stock}
                          step="1"
                          value={quantities[id] ?? 0}
                          disabled={stock <= 0}
                          onChange={(event) =>
                            updateQuantity(id, event.target.value)
                          }
                          className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
                        />
                      </label>
                    </div>
                  )
                })}
              </div>
            </section>

            <section className="rounded-2xl border border-stone-200 bg-white p-6">
              <h2 className="text-xl font-bold">收件與訂單確認</h2>

              <label className="mt-5 block text-sm font-medium">
                收件地址
                <textarea
                  value={shippingAddress}
                  onChange={(event) => setShippingAddress(event.target.value)}
                  rows={3}
                  maxLength={300}
                  required
                  placeholder="請輸入縣市、區域、路名與門牌號碼"
                  className="mt-2 w-full rounded-lg border border-stone-300 px-4 py-3"
                />
              </label>

              <div className="mt-6 flex items-center justify-between rounded-xl bg-amber-50 p-5">
                <span className="font-medium">預估訂單總額</span>
                <span className="text-2xl font-bold text-amber-900">
                  NT$ {estimatedTotal.toLocaleString('zh-TW')}
                </span>
              </div>

              <p className="mt-3 text-xs leading-5 text-stone-500">
                最終金額與庫存由後端依資料庫資料再次驗證。
              </p>

              {error && (
                <p role="alert" className="mt-4 rounded-lg bg-red-50 p-4 text-sm text-red-700">
                  {error}
                </p>
              )}

              {message && (
                <p role="status" className="mt-4 rounded-lg bg-green-50 p-4 text-sm text-green-800">
                  {message}
                </p>
              )}

              <button
                type="submit"
                disabled={loading || submitting || products.length === 0}
                className="mt-6 w-full rounded-full bg-amber-800 px-6 py-4 font-semibold text-white hover:bg-amber-900 disabled:opacity-50"
              >
                {submitting ? '訂單送出中……' : '確認並送出訂單'}
              </button>
            </section>
          </form>
        )}
      </section>
    </main>
  )
}

export default Checkout