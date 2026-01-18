import { useMemo } from 'react';

export interface TocItem {
    id: string;
    text: string;
    level: number; // 1, 2, or 3
}

export const useTocExtraction = (markdown: string): TocItem[] => {
    return useMemo(() => {
        // Remove code blocks to avoid extracting headers from comments within them
        const strippedMarkdown = markdown.replace(/```[\s\S]*?```/g, '');

        const headingRegex = /^(#{1,3})\s+(.+)$/gm;
        const toc: TocItem[] = [];
        let match;

        while ((match = headingRegex.exec(strippedMarkdown)) !== null) {
            const level = match[1].length;
            const text = match[2].trim();

            // Generate ID from heading text (slugify)
            const id = text
                .toLowerCase()
                .replace(/[^\w가-힣\s-]/g, '') // Keep Korean characters
                .replace(/\s+/g, '-')
                .replace(/-+/g, '-')
                .trim();

            toc.push({ id, text, level });
        }

        return toc;
    }, [markdown]);
};
