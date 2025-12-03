import { useState, useEffect } from 'react';
import { getTemplates, createTemplate, updateTemplate, deleteTemplate, getMe } from '../api';
import type { Template, User } from '../types';

interface TemplateManagerProps {
    isOpen: boolean;
    onClose: () => void;
    onTemplateUpdate?: () => void;
}

const TemplateManager = ({ isOpen, onClose, onTemplateUpdate }: TemplateManagerProps) => {
    const [templates, setTemplates] = useState<Template[]>([]);
    const [user, setUser] = useState<User | null>(null);
    const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [formData, setFormData] = useState({ name: '', content: '', isPublic: false });

    useEffect(() => {
        if (isOpen) {
            loadTemplates();
            loadUser();
        }
    }, [isOpen]);

    const loadTemplates = async () => {
        try {
            const res = await getTemplates();
            setTemplates(res.data);
        } catch (error) {
            console.error('Failed to load templates:', error);
        }
    };

    const loadUser = async () => {
        try {
            const res = await getMe();
            setUser(res.data);
        } catch (error) {
            console.error('Failed to load user:', error);
        }
    };

    const handleCreate = async () => {
        if (!formData.name.trim() || !formData.content.trim()) {
            alert('템플릿 이름과 내용을 입력해주세요.');
            return;
        }

        try {
            await createTemplate({
                name: formData.name,
                content: formData.content,
                isPublic: formData.isPublic,
            });
            setFormData({ name: '', content: '', isPublic: false });
            setIsCreating(false);
            loadTemplates();
            if (onTemplateUpdate) onTemplateUpdate();
        } catch (error) {
            console.error('Failed to create template:', error);
            alert('템플릿 생성에 실패했습니다.');
        }
    };

    const handleUpdate = async () => {
        if (!editingTemplate || !formData.name.trim() || !formData.content.trim()) {
            alert('템플릿 이름과 내용을 입력해주세요.');
            return;
        }

        try {
            await updateTemplate(editingTemplate.ID, {
                name: formData.name,
                content: formData.content,
                isPublic: formData.isPublic,
            });
            setFormData({ name: '', content: '', isPublic: false });
            setEditingTemplate(null);
            loadTemplates();
            if (onTemplateUpdate) onTemplateUpdate();
        } catch (error) {
            console.error('Failed to update template:', error);
            alert('템플릿 수정에 실패했습니다.');
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('정말로 이 템플릿을 삭제하시겠습니까?')) {
            return;
        }

        try {
            await deleteTemplate(id);
            loadTemplates();
            if (onTemplateUpdate) onTemplateUpdate();
        } catch (error) {
            console.error('Failed to delete template:', error);
            alert('템플릿 삭제에 실패했습니다.');
        }
    };

    const startEdit = (template: Template) => {
        setEditingTemplate(template);
        setFormData({
            name: template.Name,
            content: template.Content,
            isPublic: template.IsPublic,
        });
        setIsCreating(false);
    };

    const startCreate = () => {
        setIsCreating(true);
        setEditingTemplate(null);
        setFormData({ name: '', content: '', isPublic: false });
    };

    const cancelEdit = () => {
        setEditingTemplate(null);
        setIsCreating(false);
        setFormData({ name: '', content: '', isPublic: false });
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content template-manager-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>템플릿 관리</h2>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>

                <div className="modal-body">
                    {(isCreating || editingTemplate) ? (
                        <div className="template-form">
                            <div className="form-group">
                                <label>템플릿 이름</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="템플릿 이름을 입력하세요"
                                />
                            </div>

                            <div className="form-group">
                                <label>템플릿 내용</label>
                                <textarea
                                    value={formData.content}
                                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                                    placeholder="템플릿 내용을 입력하세요"
                                    rows={10}
                                    style={{ fontFamily: 'monospace' }}
                                />
                            </div>

                            {user?.Role === 'admin' && (
                                <div className="form-group">
                                    <label>
                                        <input
                                            type="checkbox"
                                            checked={formData.isPublic}
                                            onChange={(e) => setFormData({ ...formData, isPublic: e.target.checked })}
                                        />
                                        <span style={{ marginLeft: '8px' }}>공개 템플릿으로 설정 (관리자 전용)</span>
                                    </label>
                                </div>
                            )}

                            <div className="template-form-actions">
                                <button className="btn btn-secondary" onClick={cancelEdit}>
                                    취소
                                </button>
                                <button
                                    className="btn btn-primary"
                                    onClick={editingTemplate ? handleUpdate : handleCreate}
                                >
                                    {editingTemplate ? '수정' : '생성'}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div style={{ marginBottom: '1rem' }}>
                                <button className="btn btn-primary" onClick={startCreate}>
                                    새 템플릿 만들기
                                </button>
                            </div>

                            <div className="template-list">
                                {templates.length === 0 ? (
                                    <div className="template-list-empty">
                                        저장된 템플릿이 없습니다
                                    </div>
                                ) : (
                                    templates.map((template) => (
                                        <div key={template.ID} className="template-list-item">
                                            <div className="template-info">
                                                <h3>
                                                    {template.Name}
                                                    {template.IsPublic && (
                                                        <span className="template-badge">공개</span>
                                                    )}
                                                </h3>
                                                <p className="template-preview">
                                                    {template.Content.substring(0, 100)}
                                                    {template.Content.length > 100 && '...'}
                                                </p>
                                            </div>
                                            {template.AuthorID === user?.ID && (
                                                <div className="template-actions">
                                                    <button
                                                        className="btn btn-sm btn-secondary"
                                                        onClick={() => startEdit(template)}
                                                    >
                                                        수정
                                                    </button>
                                                    <button
                                                        className="btn btn-sm btn-danger"
                                                        onClick={() => handleDelete(template.ID)}
                                                    >
                                                        삭제
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TemplateManager;
