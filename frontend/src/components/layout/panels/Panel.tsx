import { ReactNode, forwardRef } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { 
  Mic, 
  FileText, 
  Settings, 
  GripVertical,
  Maximize2,
  Minimize2,
  Brain,
  Network
} from 'lucide-react'

interface PanelProps {
  id: string
  title: string
  type: 'input' | 'output' | 'control' | 'settings' | 'llm_summary' | 'mind_map'
  children: ReactNode
  className?: string
  isExpanded?: boolean
  onExpand?: () => void
  onCollapse?: () => void
}

const typeConfig = {
  input: {
    icon: Mic,
    color: 'bg-blue-500',
    badge: 'Voice Input'
  },
  output: {
    icon: FileText,
    color: 'bg-green-500',
    badge: 'Transcription'
  },
  control: {
    icon: Settings,
    color: 'bg-orange-500',
    badge: 'Controls'
  },
  settings: {
    icon: Settings,
    color: 'bg-purple-500',
    badge: 'Settings'
  },
  llm_summary: {
    icon: Brain,
    color: 'bg-indigo-500',
    badge: 'AI Analysis'
  },
  mind_map: {
    icon: Network,
    color: 'bg-teal-500',
    badge: 'Mind Map'
  }
}

export const Panel = forwardRef<HTMLDivElement, PanelProps>(({ 
  id, 
  title, 
  type, 
  children, 
  className, 
  isExpanded = false,
  onExpand,
  onCollapse
}, ref) => {
  const config = typeConfig[type]
  const Icon = config.icon

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id, disabled: isExpanded })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isExpanded ? 1000 : isDragging ? 1000 : 1
  }

  // Combine the ref from useSortable with the forwarded ref
  const combinedRef = (node: HTMLDivElement | null) => {
    setNodeRef(node)
    if (typeof ref === 'function') {
      ref(node)
    } else if (ref) {
      ref.current = node
    }
  }

  const handleExpandClick = () => {
    if (isExpanded) {
      onCollapse?.()
    } else {
      onExpand?.()
    }
  }

  return (
    <div
      ref={combinedRef}
      style={style}
      className={cn(
        "h-full transition-all duration-300 ease-in-out",
        isExpanded ? "absolute inset-0 z-50" : "",
        className
      )}
    >
      <Card className="h-full flex flex-col overflow-hidden min-h-0">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className={cn("w-2 h-2 rounded-full", config.color)} />
              <CardTitle className="text-base">{title}</CardTitle>
            </div>
            <div className="flex items-center space-x-1">
              <Badge variant="secondary" className="text-xs">
                {config.badge}
              </Badge>
              {!isExpanded && (
                <button 
                  {...attributes}
                  {...listeners}
                  className="p-1 hover:bg-muted rounded cursor-grab active:cursor-grabbing"
                >
                  <GripVertical className="w-4 h-4 text-muted-foreground" />
                </button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleExpandClick}
                className="p-1 h-auto"
              >
                {isExpanded ? (
                  <Minimize2 className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <Maximize2 className="w-4 h-4 text-muted-foreground" />
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-1 pb-4 overflow-y-auto min-h-0">
          {children}
        </CardContent>
      </Card>
    </div>
  )
})

Panel.displayName = 'Panel'
