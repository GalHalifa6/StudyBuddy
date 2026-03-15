import React, { useState, useEffect } from 'react';
import {
  QuizQuestionAdmin,
  CreateQuestionRequest,
  UpdateQuestionRequest,
  CreateOptionRequest,
  UpdateOptionRequest,
  RoleType,
} from '../../api/quiz';
import { X, Plus, Trash2, Save } from 'lucide-react';

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

interface QuizQuestionEditorProps {
  question: QuizQuestionAdmin | null;
  optionId: number | null;
  onSave: (data: CreateQuestionRequest | UpdateQuestionRequest) => void;
  onSaveOption?: (data: UpdateOptionRequest) => void;
  onClose: () => void;
}

const QuizQuestionEditor: React.FC<QuizQuestionEditorProps> = ({
  question,
  optionId,
  onSave,
  onSaveOption,
  onClose,
}) => {
  const isEditing = question !== null;
  const isEditingOption = optionId !== null;

  const [questionText, setQuestionText] = useState(question?.questionText || '');
  const [orderIndex, setOrderIndex] = useState(question?.orderIndex || 1);
  const [active, setActive] = useState(question?.active ?? true);
  const [options, setOptions] = useState<CreateOptionRequest[]>(
    question?.options.map(opt => ({
      optionText: opt.optionText,
      orderIndex: opt.orderIndex,
      roleWeights: { ...opt.roleWeights },
    })) || [
      { optionText: '', orderIndex: 1, roleWeights: {} as Record<RoleType, number> },
      { optionText: '', orderIndex: 2, roleWeights: {} as Record<RoleType, number> },
      { optionText: '', orderIndex: 3, roleWeights: {} as Record<RoleType, number> },
      { optionText: '', orderIndex: 4, roleWeights: {} as Record<RoleType, number> },
    ]
  );

  const [editingOptionIndex, setEditingOptionIndex] = useState<number | null>(
    isEditingOption && question
      ? question.options.findIndex(opt => opt.optionId === optionId)
      : null
  );

  // Update state when question prop changes (for editing questions)
  useEffect(() => {
    if (question && !isEditingOption) {
      setQuestionText(question.questionText || '');
      setOrderIndex(question.orderIndex || 1);
      setActive(question.active ?? true);
      setOptions(
        question.options.map(opt => ({
          optionText: opt.optionText,
          orderIndex: opt.orderIndex,
          roleWeights: { ...opt.roleWeights },
        }))
      );
    }
  }, [question, isEditingOption]);

  // Update state when editing a specific option
  useEffect(() => {
    if (isEditingOption && question && optionId !== null) {
      const option = question.options.find(opt => opt.optionId === optionId);
      if (option) {
        const index = question.options.findIndex(opt => opt.optionId === optionId);
        setEditingOptionIndex(index);
        setOptions(prevOptions => {
          const updatedOptions = [...prevOptions];
          updatedOptions[index] = {
            optionText: option.optionText,
            orderIndex: option.orderIndex,
            roleWeights: { ...option.roleWeights },
          };
          return updatedOptions;
        });
      }
    }
  }, [isEditingOption, question, optionId]);

  const handleAddOption = () => {
    const newOrderIndex = Math.max(...options.map(o => o.orderIndex), 0) + 1;
    setOptions([
      ...options,
      {
        optionText: '',
        orderIndex: newOrderIndex,
        roleWeights: {} as Record<RoleType, number>,
      },
    ]);
  };

  const handleRemoveOption = (index: number) => {
    if (options.length <= 1) {
      alert('At least one option is required');
      return;
    }
    setOptions(options.filter((_, i) => i !== index));
  };

  const handleUpdateOption = (index: number, field: keyof CreateOptionRequest, value: string | number | Record<RoleType, number>) => {
    const updated = [...options];
    updated[index] = { ...updated[index], [field]: value };
    setOptions(updated);
  };

  const handleUpdateRoleWeight = (optionIndex: number, role: RoleType, weight: number) => {
    const updated = [...options];
    const currentWeights = updated[optionIndex].roleWeights || ({} as Record<RoleType, number>);
    updated[optionIndex] = {
      ...updated[optionIndex],
      roleWeights: { ...currentWeights, [role]: Math.max(0, Math.min(1, weight)) },
    };
    setOptions(updated);
  };

  const handleSave = () => {
    // If editing a single option, use onSaveOption
    if (isEditingOption && editingOptionIndex !== null && onSaveOption) {
      const editingOption = options[editingOptionIndex];
      
      // Validation
      if (!editingOption.optionText.trim()) {
        alert('Option text is required');
        return;
      }

      const hasWeight = Object.values(editingOption.roleWeights || {}).some(w => w > 0);
      if (!hasWeight) {
        alert('Option must have at least one role weight > 0');
        return;
      }

      const updateData: UpdateOptionRequest = {
        optionText: editingOption.optionText,
        orderIndex: editingOption.orderIndex,
        roleWeights: editingOption.roleWeights,
      };
      onSaveOption(updateData);
      return;
    }

    // If editing a question (not an option), validate question fields and options
    if (isEditing) {
      // Validation for question update
      if (!questionText.trim()) {
        alert('Question text is required');
        return;
      }

      // Validate options if they exist
      if (options && options.length > 0) {
        for (let i = 0; i < options.length; i++) {
          const opt = options[i];
          if (!opt.optionText.trim()) {
            alert(`Option ${i + 1} text is required`);
            return;
          }

          const hasWeight = Object.values(opt.roleWeights || {}).some(w => w > 0);
          if (!hasWeight) {
            alert(`Option ${i + 1} must have at least one role weight > 0`);
            return;
          }
        }
      }

      const updateData: UpdateQuestionRequest = {
        questionText,
        orderIndex,
        active,
        options: options.map(opt => ({
          optionText: opt.optionText,
          orderIndex: opt.orderIndex,
          roleWeights: opt.roleWeights,
        })),
      };
      onSave(updateData);
      return;
    }

    // Creating a new question - validate everything including options
    if (!questionText.trim()) {
      alert('Question text is required');
      return;
    }

    if (options.length === 0) {
      alert('At least one option is required');
      return;
    }

    for (let i = 0; i < options.length; i++) {
      const opt = options[i];
      if (!opt.optionText.trim()) {
        alert(`Option ${i + 1} text is required`);
        return;
      }

      const hasWeight = Object.values(opt.roleWeights || {}).some(w => w > 0);
      if (!hasWeight) {
        alert(`Option ${i + 1} must have at least one role weight > 0`);
        return;
      }
    }

    const createData: CreateQuestionRequest = {
      questionText,
      orderIndex,
      options: options.map(opt => ({
        optionText: opt.optionText,
        orderIndex: opt.orderIndex,
        roleWeights: opt.roleWeights,
      })),
    };
    onSave(createData);
  };

  if (isEditingOption && editingOptionIndex !== null) {
    const editingOption = options[editingOptionIndex];
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">Edit Option</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-6 h-6 text-gray-600" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Option Text
              </label>
              <input
                type="text"
                value={editingOption.optionText}
                onChange={(e) => handleUpdateOption(editingOptionIndex, 'optionText', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Enter option text..."
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Order Index
              </label>
              <input
                type="number"
                value={editingOption.orderIndex}
                onChange={(e) => handleUpdateOption(editingOptionIndex, 'orderIndex', parseInt(e.target.value) || 0)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                min="1"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-4">
                Role Weights (0.0 to 1.0)
              </label>
              <div className="grid grid-cols-7 gap-4">
                {ROLE_TYPES.map((role) => (
                  <div key={role}>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      {ROLE_LABELS[role]}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="1"
                      value={editingOption.roleWeights[role] || 0}
                      onChange={(e) =>
                        handleUpdateRoleWeight(
                          editingOptionIndex,
                          role,
                          parseFloat(e.target.value) || 0
                        )
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 p-6 flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              Save Option
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">
            {isEditing ? 'Edit Question' : 'Create Question'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Question Text
            </label>
            <textarea
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Enter question text..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Order Index
              </label>
              <input
                type="number"
                value={orderIndex}
                onChange={(e) => setOrderIndex(parseInt(e.target.value) || 1)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                min="1"
              />
            </div>

            {isEditing && (
              <div className="flex items-center gap-3 pt-8">
                <input
                  type="checkbox"
                  id="active"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                  className="w-5 h-5 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                />
                <label htmlFor="active" className="text-sm font-semibold text-gray-700">
                  Active
                </label>
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <label className="block text-sm font-semibold text-gray-700">Options</label>
              <button
                onClick={handleAddOption}
                className="flex items-center gap-2 px-3 py-1.5 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Option
              </button>
            </div>

            <div className="space-y-4">
              {options.map((option, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Option Text
                        </label>
                        <input
                          type="text"
                          value={option.optionText}
                          onChange={(e) => handleUpdateOption(index, 'optionText', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                          placeholder="Enter option text..."
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Order Index
                        </label>
                        <input
                          type="number"
                          value={option.orderIndex}
                          onChange={(e) => handleUpdateOption(index, 'orderIndex', parseInt(e.target.value) || 0)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                          min="1"
                        />
                      </div>
                    </div>
                    {options.length > 1 && (
                      <button
                        onClick={() => handleRemoveOption(index)}
                        className="ml-3 p-2 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </button>
                    )}
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <label className="block text-xs font-semibold text-gray-700 mb-3">
                      Role Weights (0.0 to 1.0)
                    </label>
                    <div className="grid grid-cols-7 gap-2">
                      {ROLE_TYPES.map((role) => (
                        <div key={role}>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            {ROLE_LABELS[role]}
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            max="1"
                            value={option.roleWeights[role] || 0}
                            onChange={(e) =>
                              handleUpdateRoleWeight(index, role, parseFloat(e.target.value) || 0)
                            }
                            className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-xs"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 p-6 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {isEditing ? 'Update Question' : 'Create Question'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuizQuestionEditor;

