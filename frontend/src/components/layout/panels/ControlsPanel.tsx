import { Button } from '@/components/ui/button'

export function ControlsPanel() {
  return (
    <div className="p-4 h-full flex flex-col">
      <div className="flex-1 space-y-4">
        {/* Recording Status */}
        <div className="text-center p-3 bg-muted rounded-lg">
          <div className="w-3 h-3 bg-red-500 rounded-full mx-auto mb-2 animate-pulse"></div>
          <p className="text-sm text-muted-foreground">Not Recording</p>
        </div>
        
        {/* Control Buttons */}
        <div className="space-y-3">
          <Button 
            variant="default"
            size="sm"
            className="w-full"
          >
            Clear All
          </Button>
          <Button 
            variant="secondary"
            size="sm"
            className="w-full"
          >
            Save Transcription
          </Button>
          <Button 
            variant="destructive"
            size="sm"
            className="w-full"
          >
            Emergency Stop
          </Button>
        </div>
        
        {/* Quick Actions */}
        <div className="pt-4 border-t">
          <h4 className="text-sm font-medium text-muted-foreground mb-2">Quick Actions</h4>
          <div className="grid grid-cols-2 gap-2">
            <Button 
              variant="outline"
              size="sm"
              className="w-full"
            >
              Copy Text
            </Button>
            <Button 
              variant="outline"
              size="sm"
              className="w-full"
            >
              Export
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
