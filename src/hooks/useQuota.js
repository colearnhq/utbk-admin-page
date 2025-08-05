import { useState, useEffect, useCallback } from 'react';
import { getUserUnderReviewCount, canUserTakeNewQuestion } from '../services/supabase';
import { useAuth } from './useAuth';

export const useQuota = (maxLimit = 10) => {
    const { userData } = useAuth();
    const [quotaData, setQuotaData] = useState({
        currentCount: 0,
        maxLimit,
        canTakeNew: true,
        percentage: 0,
        loading: true,
        error: null
    });

    const fetchQuotaData = useCallback(async () => {
        if (!userData?.id) {
            setQuotaData(prev => ({ ...prev, loading: false }));
            return;
        }

        try {
            setQuotaData(prev => ({ ...prev, loading: true, error: null }));

            const [currentCount, canTakeResult] = await Promise.all([
                getUserUnderReviewCount(userData.id),
                canUserTakeNewQuestion(userData.id, maxLimit)
            ]);

            const percentage = (currentCount / maxLimit) * 100;

            setQuotaData({
                currentCount,
                maxLimit,
                canTakeNew: canTakeResult.canTake,
                percentage,
                loading: false,
                error: null
            });

        } catch (error) {
            console.error('Error fetching quota data:', error);
            setQuotaData(prev => ({
                ...prev,
                loading: false,
                error: error.message || 'Failed to fetch quota data'
            }));
        }
    }, [userData?.id, maxLimit]);

    const refreshQuota = useCallback(() => {
        fetchQuotaData();
    }, [fetchQuotaData]);

    const checkCanTakeQuestion = useCallback(async () => {
        if (!userData?.id) return false;

        try {
            const result = await canUserTakeNewQuestion(userData.id, maxLimit);

            // Update local state
            setQuotaData(prev => ({
                ...prev,
                canTakeNew: result.canTake,
                currentCount: result.currentCount
            }));

            return result.canTake;
        } catch (error) {
            console.error('Error checking quota:', error);
            return false;
        }
    }, [userData?.id, maxLimit]);

    const incrementCount = useCallback(() => {
        setQuotaData(prev => {
            const newCount = prev.currentCount + 1;
            const newPercentage = (newCount / maxLimit) * 100;

            return {
                ...prev,
                currentCount: newCount,
                percentage: newPercentage,
                canTakeNew: newCount < maxLimit
            };
        });
    }, [maxLimit]);

    const decrementCount = useCallback(() => {
        setQuotaData(prev => {
            const newCount = Math.max(0, prev.currentCount - 1);
            const newPercentage = (newCount / maxLimit) * 100;

            return {
                ...prev,
                currentCount: newCount,
                percentage: newPercentage,
                canTakeNew: newCount < maxLimit
            };
        });
    }, [maxLimit]);

    const getQuotaStatus = useCallback(() => {
        const { percentage } = quotaData;

        if (percentage >= 100) {
            return {
                status: 'full',
                color: '#dc3545',
                message: 'Quota Full',
                priority: 'high'
            };
        }
        if (percentage >= 80) {
            return {
                status: 'high',
                color: '#fd7e14',
                message: 'Quota High',
                priority: 'medium'
            };
        }
        if (percentage >= 50) {
            return {
                status: 'medium',
                color: '#ffc107',
                message: 'Quota Medium',
                priority: 'low'
            };
        }

        return {
            status: 'low',
            color: '#28a745',
            message: 'Quota Available',
            priority: 'none'
        };
    }, [quotaData.percentage]);

    const getRemainingSlots = useCallback(() => {
        return Math.max(0, maxLimit - quotaData.currentCount);
    }, [maxLimit, quotaData.currentCount]);

    // Auto-refresh quota data when user changes
    useEffect(() => {
        fetchQuotaData();
    }, [fetchQuotaData]);

    // Optional: Auto-refresh every 5 minutes
    useEffect(() => {
        const interval = setInterval(() => {
            if (!quotaData.loading) {
                fetchQuotaData();
            }
        }, 5 * 60 * 1000); // 5 minutes

        return () => clearInterval(interval);
    }, [fetchQuotaData, quotaData.loading]);

    return {
        // Data
        quotaData,
        quotaStatus: getQuotaStatus(),
        remainingSlots: getRemainingSlots(),

        // Actions
        refreshQuota,
        checkCanTakeQuestion,
        incrementCount,
        decrementCount,

        // Computed properties
        isAtLimit: quotaData.currentCount >= maxLimit,
        isNearLimit: quotaData.percentage >= 80,
        hasAvailableSlots: quotaData.currentCount < maxLimit,

        // Utils
        formatPercentage: () => `${Math.round(quotaData.percentage)}%`,
        formatSlots: () => `${quotaData.currentCount}/${maxLimit}`,
    };
};

// Higher-order component for quota management
export const withQuota = (WrappedComponent, maxLimit = 10) => {
    return function QuotaEnhancedComponent(props) {
        const quota = useQuota(maxLimit);

        return (
            <WrappedComponent
                {...props}
                quota={quota}
            />
        );
    };
};

export default useQuota;