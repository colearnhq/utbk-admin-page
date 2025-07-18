import React from 'react';

const Pagination = ({
    currentPage,
    totalPages,
    onPageChange,
    totalItems,
    itemsPerPage,
    maxVisiblePages = 5
}) => {
    const getVisiblePages = () => {
        const pages = [];
        let start = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
        let end = Math.min(totalPages, start + maxVisiblePages - 1);

        if (end - start + 1 < maxVisiblePages) {
            start = Math.max(1, end - maxVisiblePages + 1);
        }

        for (let i = start; i <= end; i++) {
            pages.push(i);
        }

        return pages;
    };

    const visiblePages = getVisiblePages();
    const startIndex = (currentPage - 1) * itemsPerPage + 1;
    const endIndex = Math.min(currentPage * itemsPerPage, totalItems);

    if (totalPages <= 1) {
        return null;
    }

    return (
        <div className="pagination-container">
            <div className="pagination-info">
                <span className="pagination-text">
                    Showing {startIndex}-{endIndex} of {totalItems} results
                </span>
            </div>

            <div className="pagination-controls">
                <button
                    className="pagination-btn pagination-btn-prev"
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                >
                    Previous
                </button>

                {visiblePages[0] > 1 && (
                    <>
                        <button
                            className="pagination-btn pagination-btn-number"
                            onClick={() => onPageChange(1)}
                        >
                            1
                        </button>
                        {visiblePages[0] > 2 && (
                            <span className="pagination-ellipsis">...</span>
                        )}
                    </>
                )}

                {visiblePages.map(page => (
                    <button
                        key={page}
                        className={`pagination-btn pagination-btn-number ${page === currentPage ? 'active' : ''
                            }`}
                        onClick={() => onPageChange(page)}
                    >
                        {page}
                    </button>
                ))}

                {visiblePages[visiblePages.length - 1] < totalPages && (
                    <>
                        {visiblePages[visiblePages.length - 1] < totalPages - 1 && (
                            <span className="pagination-ellipsis">...</span>
                        )}
                        <button
                            className="pagination-btn pagination-btn-number"
                            onClick={() => onPageChange(totalPages)}
                        >
                            {totalPages}
                        </button>
                    </>
                )}

                <button
                    className="pagination-btn pagination-btn-next"
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                >
                    Next
                </button>
            </div>
        </div>
    );
};

export default Pagination;