import React from 'react'

export default function AlertsPanel({ alerts }) {
  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-700'
      case 'high':
        return 'bg-orange-100 text-orange-700'
      case 'medium':
        return 'bg-yellow-100 text-yellow-700'
      default:
        return 'bg-blue-100 text-blue-700'
    }
  }

  return (
    <div className="card">
      <h2 className="card-header">Recent Alerts</h2>
      <div className="space-y-3">
        {alerts.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No alerts</p>
        ) : (
          alerts.map((alert, idx) => (
            <div key={idx} className={`p-3 rounded-lg ${getSeverityColor(alert.severity)}`}>
              <div className="flex justify-between items-start">
                <h4 className="font-semibold text-sm">{alert.type.replace(/_/g, ' ').toUpperCase()}</h4>
                <span className="text-xs opacity-75">
                  {new Date(alert.createdAt).toLocaleTimeString()}
                </span>
              </div>
              <p className="text-xs mt-1">{alert.message}</p>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
