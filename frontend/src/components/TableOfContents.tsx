import { useState, useEffect, useMemo } from 'react';
import type { TocItem } from '../hooks/useTocExtraction';

interface TableOfContentsProps {
    items: TocItem[];
}

const TableOfContents = ({ items }: TableOfContentsProps) => {
    const [activeId, setActiveId] = useState<string>('');

    // Create a stable key from items to prevent unnecessary re-initialization
    const itemsKey = useMemo(() =>
        items.map(item => item.id).join(','),
        [items]
    );

    useEffect(() => {
        if (items.length === 0) return;

        // Observe heading elements for scroll highlighting
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        setActiveId((prevId) => {
                            // Only update if the ID actually changed
                            return prevId !== entry.target.id ? entry.target.id : prevId;
                        });
                    }
                });
            },
            { rootMargin: '-80px 0px -80% 0px' }
        );

        // Small delay to ensure DOM is ready
        const timeoutId = setTimeout(() => {
            items.forEach(({ id }) => {
                const element = document.getElementById(id);
                if (element) observer.observe(element);
            });
        }, 100);

        return () => {
            clearTimeout(timeoutId);
            observer.disconnect();
        };
    }, [itemsKey, items]);

    const handleClick = (id: string) => {
        const element = document.getElementById(id);
        if (element) {
            const offset = 80; // Header height
            const elementPosition = element.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - offset;

            window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth'
            });
        }
    };

    if (items.length === 0) return null;

    return (
        <nav className="table-of-contents">
            <h3 className="toc-title">목차</h3>
            <ol className="toc-list">
                {items.map((item) => (
                    <li
                        key={item.id}
                        className={`toc-item toc-level-${item.level} ${
                            activeId === item.id ? 'active' : ''
                        }`}
                    >
                        <a
                            href={`#${item.id}`}
                            onClick={(e) => {
                                e.preventDefault();
                                handleClick(item.id);
                            }}
                        >
                            {item.text}
                        </a>
                    </li>
                ))}
            </ol>
        </nav>
    );
};

export default TableOfContents;
