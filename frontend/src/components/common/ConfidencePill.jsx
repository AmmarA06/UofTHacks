export function ConfidencePill({ confidence }) {
    // confidence: 0.0 to 1.0
    const percentage = Math.round(confidence * 100);

    // Color scale
    let colorClass = 'bg-gray-100 text-gray-600'; // Default low
    if (percentage >= 90) colorClass = 'bg-green-100 text-green-800';
    else if (percentage >= 70) colorClass = 'bg-blue-50 text-blue-700';
    else if (percentage >= 50) colorClass = 'bg-yellow-50 text-yellow-700';

    return (
        <div className="flex items-center gap-2" title={`Confidence score: ${percentage}%`}>
            <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                    className={`h-full rounded-full transition-all duration-500 ${percentage >= 90 ? 'bg-green-500' :
                            percentage >= 70 ? 'bg-blue-500' :
                                percentage >= 50 ? 'bg-yellow-500' : 'bg-gray-400'
                        }`}
                    style={{ width: `${percentage}%` }}
                />
            </div>
            <span className="text-xs font-medium text-gray-700 tabular-nums">{percentage}%</span>
        </div>
    );
}
