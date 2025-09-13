import { Routes, Route } from 'react-router-dom'
import DeepSeekV3 from "./pages/DeepSeekV3";
import DeepSeekR1 from "./pages/DeepSeekR1";

function App() {
  return (
    <div className="w-full h-full m-0 p-0">
      <Routes>
        <Route path="/" element={<DeepSeekV3 />} />
        <Route path="/deepseek-r1" element={<DeepSeekR1 />} />
      </Routes>
    </div>
  );
}

export default App;
