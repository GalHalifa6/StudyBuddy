import React, { useState, useEffect, useCallback } from 'react';
import {
  getAdminQuestions,
  createAdminQuestion,
  updateAdminQuestion,
  deleteAdminQuestion,
  updateAdminOption,
  deleteAdminOption,
  getQuizConfig,
  updateQuizConfig,
  QuizQuestionAdmin,
  CreateQuestionRequest,
  UpdateQuestionRequest,
  UpdateOptionRequest,
  RoleType,
  QuizConfig,
} from '../../api/quiz';
import { useToast } from '../../context/ToastContext';
import {
  Plus,
  Edit,
  Trash2,
  ChevronDown,
  ChevronUp,
  Loader2,
  CheckCircle,
  XCircle,
  Settings,
  Save,
} from 'lucide-react';
import QuizQuestionEditor from './QuizQuestionEditor';

const ROLE_TYPES: RoleType[] = ['LEADER', 'PLANNER', 'EXPERT', 'CREATIVE', 'COMMUNICATOR', 'TEAM_PLAYER', 'CHALLENGER'];
const ROLE_LABELS: Record<RoleType, string> = {
  LEADER: 'Leader',
  PLANNER: 'Planner',
  EXPERT: 'Expert',
  CREATIVE: 'Creative',
  COMMUNICATOR: 'Communicator',
  TEAM_PLAYER: 'Team Player',
  CHALLENGER: 'Challenger',
};

const QuizManagement: React.FC = () => {
  const { showSuccess, showError } = useToast();
  const [questions, setQuestions] = useState<QuizQuestionAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedQuestions, setExpandedQuestions] = useState<Set<number>>(new Set());
  const [showEditor, setShowEditor] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<QuizQuestionAdmin | null>(null);
  const [editingOptionId, setEditingOptionId] = useState<number | null>(null);
  const [, setConfig] = useState<QuizConfig | null>(null);
  const [configLoading, setConfigLoading] = useState(true);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<Set<number>>(new Set());
  const [savingConfig, setSavingConfig] = useState(false);

  const loadQuestions = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getAdminQuestions();
      setQuestions(data);
    } catch (error) {
      console.error('Failed to load questions:', error);
      showError('Failed to load quiz questions');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  const loadConfig = useCallback(async () => {
    try {
      setConfigLoading(true);
      const data = await getQuizConfig();
      setConfig(data);
      // Initialize selected question IDs from config
      setSelectedQuestionIds(new Set(data.selectedQuestionIds || []));
    } catch (error) {
      console.error('Failed to load config:', error);
      showError('Failed to load quiz configuration');
    } finally {
      setConfigLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    loadQuestions();
    loadConfig();
  }, [loadQuestions, loadConfig]);

  const handleSaveConfig = async () => {
    try {
      setSavingConfig(true);
      const selectedIds = Array.from(selectedQuestionIds);
      const updated = await updateQuizConfig(selectedIds);
      setConfig(updated);
      showSuccess('Quiz configuration updated successfully');
    } catch (error) {
      console.error('Failed to save config:', error);
      showError('Failed to save quiz configuration');
    } finally {
      setSavingConfig(false);
    }
  };

  const handleToggleQuestion = (questionId: number) => {
    const newSelected = new Set(selectedQuestionIds);
    if (newSelected.has(questionId)) {
      newSelected.delete(questionId);
    } else {
      newSelected.add(questionId);
    }
    setSelectedQuestionIds(newSelected);
  };

  const handleSelectAll = () => {
    const allActiveIds = new Set(activeQuestions.map(q => q.questionId));
    setSelectedQuestionIds(allActiveIds);
  };

  const handleDeselectAll = () => {
    setSelectedQuestionIds(new Set());
  };

  const handleCreateQuestion = () => {
    setEditingQuestion(null);
    setEditingOptionId(null); // Ensure we're creating a question, not editing an option
    setShowEditor(true);
  };

  const handleEditQuestion = (question: QuizQuestionAdmin) => {
    setEditingQuestion(question);
    setEditingOptionId(null); // Ensure we're editing the question, not an option
    setShowEditor(true);
  };

  const handleDeleteQuestion = async (questionId: number) => {
    if (!window.confirm('Are you sure you want to delete this question? It will be deactivated.')) {
      return;
    }

    try {
      await deleteAdminQuestion(questionId);
      showSuccess('Question deleted successfully');
      loadQuestions();
    } catch (error) {
      console.error('Failed to delete question:', error);
      showError('Failed to delete question');
    }
  };

  const handleSaveQuestion = async (questionData: CreateQuestionRequest | UpdateQuestionRequest) => {
    try {
      if (editingQuestion) {
        await updateAdminQuestion(editingQuestion.questionId, questionData as UpdateQuestionRequest);
        showSuccess('Question updated successfully');
      } else {
        await createAdminQuestion(questionData as CreateQuestionRequest);
        showSuccess('Question created successfully');
      }
      setShowEditor(false);
      setEditingQuestion(null);
      setEditingOptionId(null);
      loadQuestions();
    } catch (error) {
      console.error('Failed to save question:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to save question';
      showError(errorMessage);
    }
  };

  const toggleExpand = (questionId: number) => {
    const newExpanded = new Set(expandedQuestions);
    if (newExpanded.has(questionId)) {
      newExpanded.delete(questionId);
    } else {
      newExpanded.add(questionId);
    }
    setExpandedQuestions(newExpanded);
  };

  const handleEditOption = async (questionId: number, optionId: number) => {
    const question = questions.find(q => q.questionId === questionId);
    if (!question) return;
    
    const option = question.options.find(opt => opt.optionId === optionId);
    if (!option) return;
    
    setEditingQuestion(question);
    setEditingOptionId(optionId);
    setShowEditor(true);
  };

  const handleSaveOption = async (questionId: number, optionId: number, optionData: UpdateOptionRequest) => {
    try {
      await updateAdminOption(questionId, optionId, optionData);
      showSuccess('Option updated successfully');
      setShowEditor(false);
      setEditingQuestion(null);
      setEditingOptionId(null);
      loadQuestions();
    } catch (error) {
      console.error('Failed to save option:', error);
      showError('Failed to save option');
    }
  };

  const handleDeleteOption = async (questionId: number, optionId: number) => {
    if (!window.confirm('Are you sure you want to delete this option?')) {
      return;
    }

    try {
      await deleteAdminOption(questionId, optionId);
      showSuccess('Option deleted successfully');
      loadQuestions();
    } catch (error) {
      console.error('Failed to delete option:', error);
      showError('Failed to delete option');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  const activeQuestions = questions.filter(q => q.active);
  const inactiveQuestions = questions.filter(q => !q.active);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Quiz Management</h2>
          <p className="text-gray-600 mt-1">Manage quiz questions and their role weights</p>
        </div>
        <button
          onClick={handleCreateQuestion}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Create Question
        </button>
      </div>

      {/* Quiz Configuration */}
      <div className="bg-white rounded-xl border-2 border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Settings className="w-6 h-6 text-primary-600" />
            <h3 className="text-lg font-semibold text-gray-900">Quiz Configuration</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSelectAll}
              disabled={configLoading || savingConfig || activeQuestions.length === 0}
              className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Select All
            </button>
            <button
              onClick={handleDeselectAll}
              disabled={configLoading || savingConfig || selectedQuestionIds.size === 0}
              className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Deselect All
            </button>
            <button
              onClick={handleSaveConfig}
              disabled={configLoading || savingConfig}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {savingConfig ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save
            </button>
          </div>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Select Questions to Show on First Login
            </label>
            <p className="text-sm text-gray-500 mb-4">
              {selectedQuestionIds.size === 0
                ? 'No questions selected - all active questions will be shown to users'
                : `${selectedQuestionIds.size} question${selectedQuestionIds.size === 1 ? '' : 's'} selected`}
            </p>
            {activeQuestions.length === 0 ? (
              <div className="bg-gray-50 rounded-lg p-4 text-center text-gray-600">
                No active questions available. Create questions first.
              </div>
            ) : (
              <div className="border border-gray-200 rounded-lg max-h-96 overflow-y-auto">
                <div className="divide-y divide-gray-200">
                  {activeQuestions
                    .sort((a, b) => a.orderIndex - b.orderIndex)
                    .map((question) => {
                      const isSelected = selectedQuestionIds.has(question.questionId);
                      return (
                        <label
                          key={question.questionId}
                          className={`flex items-start gap-3 p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                            isSelected ? 'bg-primary-50' : ''
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleQuestion(question.questionId)}
                            disabled={configLoading || savingConfig}
                            className="mt-1 w-5 h-5 text-primary-600 border-gray-300 rounded focus:ring-primary-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-semibold text-gray-500">#{question.orderIndex}</span>
                              <span className="text-sm font-medium text-gray-900">{question.questionText}</span>
                            </div>
                            <span className="text-xs text-gray-500">{question.options.length} options</span>
                          </div>
                        </label>
                      );
                    })}
                </div>
              </div>
            )}
            <p className="text-sm text-gray-500 mt-3">
              Total active questions: {activeQuestions.length}
            </p>
          </div>
        </div>
      </div>

      {/* Active Questions */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-600" />
          Active Questions ({activeQuestions.length})
        </h3>
        {activeQuestions.length === 0 ? (
          <div className="bg-gray-50 rounded-xl p-8 text-center">
            <p className="text-gray-600">No active questions. Create one to get started.</p>
          </div>
        ) : (
          activeQuestions.map((question) => (
            <QuestionCard
              key={question.questionId}
              question={question}
              expanded={expandedQuestions.has(question.questionId)}
              onToggleExpand={() => toggleExpand(question.questionId)}
              onEdit={() => handleEditQuestion(question)}
              onDelete={() => handleDeleteQuestion(question.questionId)}
              onEditOption={handleEditOption}
              onDeleteOption={handleDeleteOption}
            />
          ))
        )}
      </div>

      {/* Inactive Questions */}
      {inactiveQuestions.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <XCircle className="w-5 h-5 text-gray-400" />
            Inactive Questions ({inactiveQuestions.length})
          </h3>
          {inactiveQuestions.map((question) => (
            <QuestionCard
              key={question.questionId}
              question={question}
              expanded={expandedQuestions.has(question.questionId)}
              onToggleExpand={() => toggleExpand(question.questionId)}
              onEdit={() => handleEditQuestion(question)}
              onDelete={() => handleDeleteQuestion(question.questionId)}
              onEditOption={handleEditOption}
              onDeleteOption={handleDeleteOption}
            />
          ))}
        </div>
      )}

      {/* Editor Modal */}
      {showEditor && (
        <QuizQuestionEditor
          question={editingQuestion}
          optionId={editingOptionId}
          onSave={handleSaveQuestion}
          onSaveOption={editingQuestion && editingOptionId ? 
            (data) => handleSaveOption(editingQuestion.questionId, editingOptionId, data) : 
            undefined}
          onClose={() => {
            setShowEditor(false);
            setEditingQuestion(null);
            setEditingOptionId(null);
          }}
        />
      )}
    </div>
  );
};

interface QuestionCardProps {
  question: QuizQuestionAdmin;
  expanded: boolean;
  onToggleExpand: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onEditOption: (questionId: number, optionId: number) => void;
  onDeleteOption: (questionId: number, optionId: number) => void;
}

const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  expanded,
  onToggleExpand,
  onEdit,
  onDelete,
  onEditOption,
  onDeleteOption,
}) => {
  return (
    <div className={`bg-white rounded-xl border-2 ${question.active ? 'border-gray-200' : 'border-gray-300 opacity-75'}`}>
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-sm font-semibold text-gray-500">#{question.orderIndex}</span>
              {question.active ? (
                <span className="px-2 py-1 text-xs font-semibold bg-green-100 text-green-700 rounded-full">
                  Active
                </span>
              ) : (
                <span className="px-2 py-1 text-xs font-semibold bg-gray-100 text-gray-600 rounded-full">
                  Inactive
                </span>
              )}
            </div>
            <p className="text-gray-900 font-medium">{question.questionText}</p>
            <p className="text-sm text-gray-600 mt-1">{question.options.length} options</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onToggleExpand}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              {expanded ? (
                <ChevronUp className="w-5 h-5 text-gray-600" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-600" />
              )}
            </button>
            <button
              onClick={onEdit}
              className="p-2 hover:bg-blue-50 rounded-lg transition-colors"
            >
              <Edit className="w-5 h-5 text-blue-600" />
            </button>
            <button
              onClick={onDelete}
              className="p-2 hover:bg-red-50 rounded-lg transition-colors"
            >
              <Trash2 className="w-5 h-5 text-red-600" />
            </button>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <div className="space-y-3">
            <h4 className="font-semibold text-gray-900">Options:</h4>
            {question.options.map((option) => (
              <div
                key={option.optionId}
                className="bg-white rounded-lg p-4 border border-gray-200"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold text-gray-500">#{option.orderIndex}</span>
                      <span className="text-sm font-medium text-gray-900">{option.optionText}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onEditOption(question.questionId, option.optionId)}
                      className="p-1.5 hover:bg-blue-50 rounded transition-colors"
                    >
                      <Edit className="w-4 h-4 text-blue-600" />
                    </button>
                    <button
                      onClick={() => onDeleteOption(question.questionId, option.optionId)}
                      className="p-1.5 hover:bg-red-50 rounded transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-xs font-semibold text-gray-600 mb-2">Role Weights:</p>
                  <div className="grid grid-cols-7 gap-2">
                    {ROLE_TYPES.map((role) => (
                      <div key={role} className="text-center">
                        <div className="text-xs text-gray-600 mb-1">{ROLE_LABELS[role]}</div>
                        <div className="text-sm font-semibold text-gray-900">
                          {option.roleWeights[role]?.toFixed(2) || '0.00'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default QuizManagement;

