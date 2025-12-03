import { useState, useEffect } from 'react';
import { getTemplates } from '../api';
import type { Template } from '../types';

interface TemplateSelectorProps {
    onSelect: (content: string) => void;
    onManageClick: () => void;
}

const TemplateSelector = ({ onSelect, onManageClick }: TemplateSelectorProps) => {
    const [templates, setTemplates] = useState<Template[]>([]);
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        loadTemplates();
    }, []);

    const loadTemplates = async () => {
        try {
            const res = await getTemplates();
            setTemplates(res.data);
        } catch (error) {
            console.error('Failed to load templates:', error);
        }
    };

    const handleSelect = (template: Template) => {
        onSelect(template.Content);
        setIsOpen(false);
    };

    return (
        <div className="template-selector">
            <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setIsOpen(!isOpen)}
            >
                템플릿
                <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" style={{ marginLeft: '4px' }}>
                    <path d="M4 6l4 4 4-4H4z" />
                </svg>
            </button>

            {isOpen && (
                <div className="template-dropdown">
                    {templates.length === 0 ? (
                        <div className="template-dropdown-empty">
                            저장된 템플릿이 없습니다
                        </div>
                    ) : (
                        templates.map((template) => (
                            <button
                                key={template.ID}
                                type="button"
                                className="template-dropdown-item"
                                onClick={() => handleSelect(template)}
                            >
                                <span className="template-name">{template.Name}</span>
                                {template.IsPublic && (
                                    <span className="template-badge">공개</span>
                                )}
                            </button>
                        ))
                    )}
                    <div className="template-dropdown-divider"></div>
                    <button
                        type="button"
                        className="template-dropdown-item template-manage-btn"
                        onClick={() => {
                            setIsOpen(false);
                            onManageClick();
                        }}
                    >
                        템플릿 관리
                    </button>
                </div>
            )}
        </div>
    );
};

export default TemplateSelector;
