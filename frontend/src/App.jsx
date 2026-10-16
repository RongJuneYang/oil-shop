import { useEffect, useState } from 'react'

const API_URL = 'http://localhost:3000/api'

function App() {
  // 商品資料
  const [products, setProducts] = useState([])
  const [quantities, setQuantities] = useState({})
  const [shippingAddress, setShippingAddress] = useState('')

  // 載入與訂單訊息
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  // 會員登入狀態
  const [token, setToken] = useState(
    () => localStorage.getItem('token') || ''
  )

  const [member, setMember] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('member') || 'null')
    } catch {
      return null
    }
  })

  const [showLogin, setShowLogin] = useState(false)
  const [loginPhone, setLoginPhone] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginMessage, setLoginMessage] = useState('')

  // 取得商品列表
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
          throw new Error('商品 API 回傳格式不正確')
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

  // 更新商品數量
  function updateQuantity(productId, value) {
    const quantity =
      value === '' ? '' : Math.max(0, Number(value) || 0)

    setQuantities((previous) => ({
      ...previous,
      [productId]: quantity,
    }))
  }

  // 計算已選商品
  const selectedItems = products
    .map((product) => ({
      product_id: product.product_id,
      product_name: product.product_name,
      price: Number(product.price),
      quantity: Number(quantities[product.product_id] || 0),
      stock: Number(product.stock_quantity),
    }))
    .filter((item) => item.quantity > 0)

  // 計算預估總額
  const estimatedTotal = selectedItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  )

  // 會員登入
  async function handleLogin(event) {
    event.preventDefault()
    setLoginMessage('')

    try {
      const response = await fetch(`${API_URL}/members/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
        },
        body: JSON.stringify({
          phone: loginPhone.trim(),
          password: loginPassword,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || '登入失敗')
      }

      localStorage.setItem('token', data.token)
      localStorage.setItem('member', JSON.stringify(data.member))

      setToken(data.token)
      setMember(data.member)
      setLoginPassword('')
      setShowLogin(false)
      setLoginMessage(`登入成功，歡迎 ${data.member.user_name}`)
      setError('')
    } catch (err) {
      setLoginMessage(err.message || '登入時發生錯誤')
    }
  }

  // 會員登出
  function handleLogout() {
    localStorage.removeItem('token')
    localStorage.removeItem('member')

    setToken('')
    setMember(null)
    setLoginPassword('')
    setShowLogin(false)
    setLoginMessage('已登出')
    setMessage('')
  }

  // 送出訂單
  async function submitOrder(event) {
    event.preventDefault()
    setError('')
    setMessage('')

    if (!token) {
      setError('請先登入會員，再送出訂單。')
      setShowLogin(true)
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
        item.quantity > item.stock
    )

    if (invalidItem) {
      setError(
        `「${invalidItem.product_name}」的訂購數量不正確或超過庫存。`
      )
      return
    }

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
          handleLogout()
          setError('登入狀態可能已失效，請重新登入。')
          setShowLogin(true)
          return
        }

        throw new Error(data.message || '訂單送出失敗')
      }

      setMessage(`訂單建立成功！訂單編號：${data.order.order_id}`)
      setQuantities({})
      setShippingAddress('')

      // 重新取得商品資料，更新庫存
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
    }
  }

  return (
    <div className="min-h-screen bg-[#faf8f3] text-stone-800">
      {/* 網站導覽列 */}
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-5">
          <a
            href="#home"
            className="text-xl font-bold tracking-wider text-amber-900"
          >
            香珍麻油
            <span className="ml-2 text-xs font-normal text-stone-500">
              麻油・食用油專賣
            </span>
          </a>

          <nav className="flex flex-wrap items-center gap-5 text-sm">
            <a href="#products" className="hover:text-amber-800">
              選購商品
            </a>

            <a href="#order" className="hover:text-amber-800">
              填寫訂單
            </a>

            {token ? (
              <>
                <span className="text-stone-600">
                  你好，{member?.user_name || '會員'}
                </span>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded-full border border-amber-800 px-4 py-2 text-amber-900 hover:bg-amber-50"
                >
                  登出
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setShowLogin((previous) => !previous)
                  setLoginMessage('')
                }}
                className="rounded-full bg-amber-800 px-4 py-2 text-white hover:bg-amber-900"
              >
                會員登入
              </button>
            )}
          </nav>
        </div>
      </header>

      <main id="home">
        {/* 會員登入表單 */}
        {showLogin && !token && (
          <section className="mx-auto max-w-md px-6 py-8">
            <form
              onSubmit={handleLogin}
              className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm"
            >
              <h2 className="text-2xl font-bold text-amber-900">
                會員登入
              </h2>

              <p className="mt-2 text-sm text-stone-500">
                登入後即可送出商品訂單。
              </p>

              <label className="mt-5 block text-sm font-medium">
                手機號碼
                <input
                  type="tel"
                  value={loginPhone}
                  onChange={(event) => setLoginPhone(event.target.value)}
                  required
                  autoComplete="tel"
                  placeholder="請輸入註冊時的手機號碼"
                  className="mt-2 w-full rounded-lg border border-stone-300 px-4 py-3 outline-none focus:border-amber-700"
                />
              </label>

              <label className="mt-4 block text-sm font-medium">
                密碼
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(event) =>
                    setLoginPassword(event.target.value)
                  }
                  required
                  autoComplete="current-password"
                  placeholder="請輸入密碼"
                  className="mt-2 w-full rounded-lg border border-stone-300 px-4 py-3 outline-none focus:border-amber-700"
                />
              </label>

              {loginMessage && (
                <p
                  role="alert"
                  className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700"
                >
                  {loginMessage}
                </p>
              )}

              <div className="mt-6 flex gap-3">
                <button
                  type="submit"
                  className="flex-1 rounded-full bg-amber-800 px-4 py-3 font-semibold text-white hover:bg-amber-900"
                >
                  登入
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowLogin(false)
                    setLoginMessage('')
                  }}
                  className="rounded-full border border-stone-300 px-4 py-3 hover:bg-stone-50"
                >
                  取消
                </button>
              </div>
            </form>
          </section>
        )}

        {/* 網站首頁介紹 */}
        <section className="mx-auto max-w-7xl px-6 py-12 md:py-16">
          <p className="text-sm font-semibold tracking-[0.25em] text-amber-800">
            ONLINE ORDER
          </p>

          <h1 className="mt-4 text-4xl font-bold leading-tight md:text-5xl">
            麻油及食用油訂購
          </h1>

          <p className="mt-5 max-w-2xl leading-8 text-stone-600">
            選擇想購買的商品與數量，填寫收件地址，即可送出訂單。
            商品價格與庫存以系統資料為準。
          </p>
        </section>

        {/* 商品列表 */}
        <section id="products" className="bg-white py-12 md:py-16">
          <div className="mx-auto max-w-7xl px-6">
            <div className="mb-8">
              <h2 className="text-2xl font-bold">選購商品</h2>
              <p className="mt-2 text-sm text-stone-500">
                請輸入每項商品的訂購數量；未選購的商品請填 0。
              </p>
            </div>

            {loading ? (
              <p className="py-10 text-stone-500">
                正在載入商品資料……
              </p>
            ) : error && products.length === 0 ? (
              <p className="rounded-xl bg-red-50 p-4 text-red-700">
                {error}
              </p>
            ) : products.length === 0 ? (
              <p className="rounded-xl bg-amber-50 p-4 text-amber-900">
                目前沒有可供訂購的商品。
              </p>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {products.map((product) => {
                  const id = product.product_id
                  const stock = Number(product.stock_quantity)
                  const quantity = quantities[id] ?? 0

                  return (
                    <article
                      key={id}
                      className="rounded-2xl border border-stone-200 bg-[#fffdfa] p-6"
                    >
                      <div className="flex h-28 items-center justify-center overflow-hidden rounded-xl bg-amber-50 text-5xl">
                        {product.image_url ? (
                          <img
                            src={product.image_url}
                            alt={product.product_name}
                            className="h-full w-full rounded-xl object-cover"
                          />
                        ) : (
                          '🫙'
                        )}
                      </div>

                      <h3 className="mt-5 text-xl font-bold">
                        {product.product_name}
                      </h3>

                      <p className="mt-2 min-h-12 text-sm leading-6 text-stone-600">
                        {product.description || '歡迎選購本店商品。'}
                      </p>

                      <div className="mt-4 flex items-end justify-between gap-3">
                        <p className="text-xl font-bold text-amber-900">
                          NT$ {Number(product.price).toLocaleString('zh-TW')}
                        </p>

                        <p className="text-sm text-stone-500">
                          庫存：{stock}
                        </p>
                      </div>

                      <label className="mt-5 block text-sm font-medium">
                        訂購數量
                        <input
                          type="number"
                          min="0"
                          max={stock}
                          step="1"
                          value={quantity}
                          disabled={stock <= 0}
                          onChange={(event) =>
                            updateQuantity(id, event.target.value)
                          }
                          className="mt-2 w-full rounded-lg border border-stone-300 bg-white px-4 py-3 outline-none focus:border-amber-700"
                        />
                      </label>

                      {stock <= 0 && (
                        <p className="mt-2 text-sm text-red-600">
                          目前缺貨
                        </p>
                      )}

                      <p className="mt-3 text-right text-sm text-stone-600">
                        小計：NT${' '}
                        {(
                          (Number(quantity) || 0) * Number(product.price)
                        ).toLocaleString('zh-TW')}
                      </p>
                    </article>
                  )
                })}
              </div>
            )}
          </div>
        </section>

        {/* 訂單確認 */}
        <section
          id="order"
          className="mx-auto max-w-4xl px-6 py-12 md:py-16"
        >
          <form
            onSubmit={submitOrder}
            className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm md:p-8"
          >
            <h2 className="text-2xl font-bold">確認訂單</h2>

            <p className="mt-2 text-sm text-stone-500">
              請確認選購商品與數量，並填寫完整收件地址。
            </p>

            <div className="mt-6 rounded-xl bg-amber-50 p-5">
              <div className="flex items-center justify-between gap-4">
                <span className="font-medium">預估訂單總額</span>
                <span className="text-2xl font-bold text-amber-900">
                  NT$ {estimatedTotal.toLocaleString('zh-TW')}
                </span>
              </div>

              <p className="mt-2 text-xs leading-5 text-stone-500">
                此金額為前端估算，實際訂單金額由後端依資料庫商品價格計算。
              </p>
            </div>

            <label className="mt-6 block text-sm font-medium">
              收件地址
              <textarea
                value={shippingAddress}
                onChange={(event) => setShippingAddress(event.target.value)}
                rows={3}
                maxLength={300}
                placeholder="請輸入縣市、區域、路名與門牌號碼"
                className="mt-2 w-full rounded-lg border border-stone-300 px-4 py-3 outline-none focus:border-amber-700"
              />
            </label>

            {error && (
              <p
                role="alert"
                className="mt-4 rounded-lg bg-red-50 p-4 text-sm text-red-700"
              >
                {error}
              </p>
            )}

            {message && (
              <p
                role="status"
                className="mt-4 rounded-lg bg-green-50 p-4 text-sm text-green-800"
              >
                {message}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || products.length === 0}
              className="mt-6 w-full rounded-full bg-amber-800 px-6 py-4 font-semibold text-white transition hover:bg-amber-900 disabled:cursor-not-allowed disabled:opacity-50"
            >
              送出訂單
            </button>

            <p className="mt-4 text-center text-xs leading-5 text-stone-500">
              送出訂單前需先登入會員；系統會在後端再次驗證商品庫存。
            </p>
          </form>
        </section>
      </main>

      {/* 頁尾 */}
      <footer className="bg-stone-900 px-6 py-8 text-center text-sm text-stone-300">
        <p>油香小舖｜麻油及食用油線上訂購系統</p>
      </footer>
    </div>
  )
}

export default App