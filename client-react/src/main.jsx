import React from 'react'
import ReactDOM from 'react-dom/client'
import { Provider } from 'react-redux'
import App from './App.jsx'
import './index.css'
import { store } from './store/store'
import { logout } from './store/authSlice'
import { setupInterceptors } from './services/api'

// Inject store and logout action into API interceptors
setupInterceptors(store, logout)

ReactDOM.createRoot(document.getElementById('root')).render(
  <Provider store={store}>
    <App />
  </Provider>,
)
