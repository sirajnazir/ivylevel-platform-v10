import React from 'react'
import ReactDOM from 'react-dom/client'
// import App from './App'
import App from './AppDebugLatest'
// import App from './AppSimpleTest'
// import App from './DebugApp'
// import App from './AppMinimalTest'
// import AppBasic from './AppBasic'
// import AppMinimal from './AppMinimal'
// import AppTest from './AppTest'
// import App from './AppWorking'
// import App from './AppTest'
// import App from './AppSimplified'
// import App from './AppDebugStep'
// import App from './AppDebugImports'
// import App from './AppSafe'
// import App from './TestApp'
// import App from './AppDebug'
// import App from './AppStep'
// import App from './AppWithAuth'
// import App from './AppMinimal'
// import App from './AppFixed'
// import App from './AppSimple'
// import App from './AppFinal'
import './index.css'
import './styles/global.css'

const rootElement = document.getElementById('root');
console.log('Root element:', rootElement);

if (!rootElement) {
  document.body.innerHTML = '<h1>Error: Root element not found</h1>';
} else {
  try {
    ReactDOM.createRoot(rootElement).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>,
    );
  } catch (error) {
    console.error('Render error:', error);
    rootElement.innerHTML = `<h1>Render Error</h1><pre>${error}</pre>`;
  }
}