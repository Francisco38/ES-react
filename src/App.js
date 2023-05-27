import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { HomePage } from './views';
import { LoginPage } from './views';
import { Prescription } from './views';
import { Delivery } from './views';
import { LogOut } from './views';
import { Qr } from './views';

function App() {
  return (
    <Router>
      <div>
        <Routes>
          <Route exact path="/" element={<LoginPage />} />
          <Route exact path="login" element={<LoginPage />} />
          <Route exact path="home" element={<HomePage />} />
          <Route exact path="prescription/:prescriptionId" element={<Prescription />} />
          <Route exact path="delivery" element={<Delivery />} />
          <Route exact path="qr" element={<Qr />} />
          <Route exact path="logout" element={<LogOut />} />
          <Route path='*' element={<LoginPage />} />
        </Routes>
      </div>
    </Router>
  );
}
export default App;