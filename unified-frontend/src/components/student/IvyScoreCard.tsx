import React from 'react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { motion } from 'framer-motion'

interface IvyScoreCardProps {
  score: number
  trend?: string
  loading?: boolean
  className?: string
}

export const IvyScoreCard: React.FC<IvyScoreCardProps> = ({ 
  score, 
  trend, 
  loading = false,
  className = '' 
}) => {
  const getTrendIcon = () => {
    if (!trend) return null
    
    const trendValue = parseInt(trend)
    if (trendValue > 0) {
      return <TrendingUp className="w-4 h-4 text-student-success" />
    } else if (trendValue < 0) {
      return <TrendingDown className="w-4 h-4 text-student-error" />
    }
    return <Minus className="w-4 h-4 text-unified-text-secondary" />
  }
  
  const getTrendColor = () => {
    if (!trend) return ''
    
    const trendValue = parseInt(trend)
    if (trendValue > 0) return 'text-student-success'
    if (trendValue < 0) return 'text-student-error'
    return 'text-unified-text-secondary'
  }
  
  const getScoreColor = () => {
    if (score >= 80) return 'text-student-success'
    if (score >= 60) return 'text-student-warning'
    return 'text-student-error'
  }
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={`bg-white rounded-lg shadow-md p-6 ${className}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-sm font-medium text-unified-text-secondary mb-1">
            Ivy+ Ready Score
          </h3>
          {loading ? (
            <div className="h-12 w-24 bg-gray-200 animate-pulse rounded" />
          ) : (
            <div className="flex items-baseline gap-2">
              <span className={`text-4xl font-bold ${getScoreColor()}`}>
                {score}
              </span>
              <span className="text-2xl text-unified-text-secondary">/100</span>
            </div>
          )}
        </div>
        
        {trend && !loading && (
          <div className={`flex items-center gap-1 ${getTrendColor()}`}>
            {getTrendIcon()}
            <span className="text-sm font-medium">{trend}</span>
          </div>
        )}
      </div>
      
      <div className="mt-4">
        <div className="w-full bg-gray-200 rounded-full h-2">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${score}%` }}
            transition={{ duration: 1, delay: 0.2 }}
            className={`h-2 rounded-full ${
              score >= 80 ? 'bg-student-success' : 
              score >= 60 ? 'bg-student-warning' : 
              'bg-student-error'
            }`}
          />
        </div>
      </div>
      
      <p className="mt-3 text-xs text-unified-text-secondary">
        {score >= 80 && "Excellent! You're on track for Ivy+ admissions"}
        {score >= 60 && score < 80 && "Good progress! Keep working on your profile"}
        {score < 60 && "Let's work together to improve your readiness"}
      </p>
    </motion.div>
  )
}