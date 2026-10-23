import { DndContext, DragOverlay, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { useState } from 'react';
import { PIPELINE_STAGES } from '../../../data/pipelineStages';
import { PipelineColumn } from './PipelineColumn';
import { CandidateCard } from './CandidateCard';

export function PipelineBoard({ groupedByStage, isDarkMode, onView, onMove, onRequestReject }) {
  const [activeApplication, setActiveApplication] = useState(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );

  const handleDragStart = ({ active }) => setActiveApplication(active.data.current?.application || null);
  const handleDragEnd = ({ active, over }) => {
    setActiveApplication(null);
    if (!over) return;
    const application = active.data.current?.application;
    const targetStage = String(over.id);
    if (!application || application.stage === targetStage) return;
    if (targetStage === 'rejected') onRequestReject(application);
    else onMove(application.id, targetStage);
  };

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragCancel={() => setActiveApplication(null)}>
      <div className="overflow-x-auto pb-3">
        <div className="flex min-w-max items-start gap-4">
          {PIPELINE_STAGES.map((stage) => (
            <PipelineColumn
              key={stage.id}
              stage={stage}
              applications={groupedByStage[stage.id] || []}
              isDarkMode={isDarkMode}
              onView={onView}
              onMove={onMove}
              onRequestReject={onRequestReject}
            />
          ))}
        </div>
      </div>
      <DragOverlay>
        {activeApplication ? (
          <div className="w-[300px] rotate-1 opacity-90">
            <CandidateCard application={activeApplication} isDarkMode={isDarkMode} overlay />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
