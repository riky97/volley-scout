import { useId, useState } from 'react';
import type { RosterTemplate } from '@domain/index';
import { COMMON_BUTTONS, DIALOGS, ROSTER } from '@shared/copy';
import { Button } from '@presentation/components/ui/Button';
import { Dialog } from '@presentation/components/ui/Dialog';
import { Label } from '@presentation/components/ui/Label';
import { Input } from '@presentation/components/ui/Input';
import { Select } from '@presentation/components/ui/Select';

export interface TemplateManagerProps {
  readonly templates: readonly RosterTemplate[];
  readonly isLoading: boolean;
  readonly onLoad: (template: RosterTemplate) => void;
  readonly onSave: (name: string) => string | null;
  readonly onRename: (template: RosterTemplate, name: string) => string | null;
  readonly onDelete: (template: RosterTemplate) => void;
}

/** Roster template picker: load into the current match, save, rename or delete one. */
export function TemplateManager({
  templates,
  isLoading,
  onLoad,
  onSave,
  onRename,
  onDelete,
}: TemplateManagerProps): React.JSX.Element {
  const [selectedId, setSelectedId] = useState<string>('');
  const [saveOpen, setSaveOpen] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<RosterTemplate | null>(null);
  const [renameName, setRenameName] = useState('');
  const [renameError, setRenameError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<RosterTemplate | null>(null);

  const selectId = useId();
  const selected = templates.find((template) => template.id === selectedId) ?? null;

  return (
    <div className="flex flex-wrap items-end gap-[var(--sp-3)]">
      <div className="flex flex-col gap-[var(--sp-1)]">
        <Label htmlFor={selectId}>
          {ROSTER.template}
        </Label>
        <Select
          id={selectId}
          value={selectedId}
          onChange={(event) => {
            setSelectedId(event.target.value);
          }}
          disabled={isLoading || templates.length === 0}
          className="min-w-[200px]"
        >
          <option value="">
            {isLoading ? ROSTER.loadingTemplates : ROSTER.template}
          </option>
          {templates.map((template) => (
            <option key={template.id} value={template.id}>
              {template.name}
            </option>
          ))}
        </Select>
      </div>

      <Button
        variant="secondary"
        disabled={selected === null}
        onClick={() => {
          if (selected !== null) onLoad(selected);
        }}
      >
        {ROSTER.loadTemplate}
      </Button>

      <Button
        variant="secondary"
        onClick={() => {
          setSaveName('');
          setSaveError(null);
          setSaveOpen(true);
        }}
      >
        {ROSTER.saveTemplate}
      </Button>

      {selected !== null && (
        <>
          <Button
            variant="ghost"
            onClick={() => {
              setRenaming(selected);
              setRenameName(selected.name);
              setRenameError(null);
            }}
          >
            {COMMON_BUTTONS.edit}
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              setDeleting(selected);
            }}
          >
            {ROSTER.deleteTemplate}
          </Button>
        </>
      )}

      <Dialog
        open={saveOpen}
        title={ROSTER.saveTemplate}
        confirmLabel={COMMON_BUTTONS.save}
        onConfirm={() => {
          const message = onSave(saveName);
          if (message !== null) {
            setSaveError(message);
            return;
          }
          setSaveOpen(false);
        }}
        onCancel={() => {
          setSaveOpen(false);
        }}
      >
        <div className="flex flex-col gap-[var(--sp-2)]">
          <Label htmlFor="template-save-name">
            {ROSTER.template}
          </Label>
          <Input
            id="template-save-name"
            value={saveName}
            onChange={(event) => {
              setSaveName(event.target.value);
            }}
          />
          {saveError !== null && (
            <p role="alert" className="text-[var(--fs-small)] text-[var(--outcome-error)]">
              {saveError}
            </p>
          )}
        </div>
      </Dialog>

      <Dialog
        open={renaming !== null}
        title={COMMON_BUTTONS.edit}
        confirmLabel={COMMON_BUTTONS.save}
        onConfirm={() => {
          if (renaming === null) return;
          const message = onRename(renaming, renameName);
          if (message !== null) {
            setRenameError(message);
            return;
          }
          setRenaming(null);
        }}
        onCancel={() => {
          setRenaming(null);
        }}
      >
        <div className="flex flex-col gap-[var(--sp-2)]">
          <Label htmlFor="template-rename-name">
            {ROSTER.template}
          </Label>
          <Input
            id="template-rename-name"
            value={renameName}
            onChange={(event) => {
              setRenameName(event.target.value);
            }}
          />
          {renameError !== null && (
            <p role="alert" className="text-[var(--fs-small)] text-[var(--outcome-error)]">
              {renameError}
            </p>
          )}
        </div>
      </Dialog>

      <Dialog
        open={deleting !== null}
        title={DIALOGS.confirmDeleteTemplate.title}
        description={deleting !== null ? DIALOGS.confirmDeleteTemplate.body(deleting.name) : undefined}
        destructive
        confirmLabel={DIALOGS.confirmDeleteTemplate.confirm}
        cancelLabel={DIALOGS.confirmDeleteTemplate.cancel}
        onConfirm={() => {
          if (deleting !== null) {
            onDelete(deleting);
            setSelectedId('');
          }
          setDeleting(null);
        }}
        onCancel={() => {
          setDeleting(null);
        }}
      />
    </div>
  );
}

