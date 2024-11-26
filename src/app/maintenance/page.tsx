export default function MaintenancePage() {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold">System Maintenance</h1>
          <p className="text-lg text-muted-foreground">
            We're performing some maintenance. Please try again in a few minutes.
          </p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }