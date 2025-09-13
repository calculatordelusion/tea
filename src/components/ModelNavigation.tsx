import { useNavigate, useLocation } from 'react-router-dom'
import { cn } from "@/lib/utils"

const ModelNavigation = () => {
  const navigate = useNavigate()
  const location = useLocation()
  
  const currentModel = location.pathname === '/deepseek-r1' ? 'deepseek-r1' : 'deepseek-v3'

  const ModelTab = ({ value, path, children }: { value: string; path: string; children: React.ReactNode }) => {
    const isActive = currentModel === value
    return (
      <button
        type="button"
        onClick={() => navigate(path)}
        className={cn(
          "px-4 py-2 rounded-md text-sm font-medium transition-colors",
          isActive ? "deepseek-tab-active" : "deepseek-tab-inactive"
        )}
      >
        {children}
      </button>
    )
  }

  return (
    <div className="flex items-center justify-center gap-4 p-4 border-b">
      <ModelTab value="deepseek-v3" path="/">DeepSeek V3</ModelTab>
      <ModelTab value="deepseek-r1" path="/deepseek-r1">DeepSeek R1</ModelTab>
    </div>
  )
}

export default ModelNavigation
