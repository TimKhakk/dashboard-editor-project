import Konva from 'konva';
import React, { useEffect, useRef, useState } from 'react';
import { Line } from 'react-konva';
import { Stage, Layer, Text } from 'react-konva';
import { Html } from 'react-konva-utils';
import { io } from 'socket.io-client';
import { useBoolean, useEventListener } from 'usehooks-ts';
import LRect from './components/LRect';
import LText from './components/LText';
import LLine from './components/LLine';
import { capitalize } from 'lodash-es';
import { LISTENERS_MAP } from './lib/consts/socketListeners';
import { ActionItem } from '@/components/ActionItem';
import { COLORS } from '@/lib/consts/colors';
const socket = io('http://localhost:3001');

type Entity = {
  id: ReturnType<typeof crypto.randomUUID>;
}

type Point = {
  x: number;
  y: number;
}

type ActionMode = 'selection' | 'pencil' | 'text';

const ACTIONS_MODES = ['selection', 'pencil', 'text'] as const satisfies readonly ActionMode[]

const userId = crypto.randomUUID();

const App = () => {
  const [shapes, setShapes] = React.useState<Konva.Node['attrs'][]>([]);
  const [lines, setLines] = React.useState<({ points: number[] } & Entity)[]>([]);
  const textEditorRef = useRef<HTMLTextAreaElement>(null)
  const [selectedItemIds, setSelectedItemIds] = React.useState<string[]>([]);
  const [texts, setTexts] = useState<({ text: string } & Point & Entity)[]>([]);
  const [textEditor, setTextEditor] = useState<{
    active: boolean;
    x: number;
    y: number;
    value: string;
}>({
    active: false,
    x: 0,
    y: 0,
    value: '',
  })
  const [collaborators, setCollaborators] = useState<({ userName: string | undefined } & Entity & Point)[]>(
    [],
  );
  const {
    value: isDrawing,
    setTrue: startDrawing,
    setFalse: stopDrawing,
  } = useBoolean(false);

  const stageRef = React.useRef<Konva.Stage>(null);
  const layerRef = React.useRef<Konva.Layer>(null);

  const [mode, setMode] = useState<ActionMode>('selection');
  const { value: stageDraggable, setTrue: enableStageDraggable, setFalse: disableStageDraggable } = useBoolean(false);

  useEventListener('keydown', (e) => {
    if (e.code !== 'Space') return;
    document.documentElement.style.cursor = 'grab';
    enableStageDraggable();
  });
  useEventListener('keyup', (e) => {
    if (e.code !== 'Space') return;
    document.documentElement.style.cursor = '';
    disableStageDraggable();
  });
  useEventListener('keydown', (e) => {
    if (e.code !== 'Backspace') return;
    setShapes((prev) => prev.filter((star) => !selectedItemIds.includes(star.id)));
    setTexts((prev) => prev.filter((text) => !selectedItemIds.includes(text.id)));
    setLines((prev) => prev.filter((line) => !selectedItemIds.includes(line.id)));
  });

  useEffect(() => {
    socket.emit(LISTENERS_MAP.ClientReady);

    socket.on(LISTENERS_MAP.GetCanvasState, () => {
      socket.emit(LISTENERS_MAP.SendingAppStateToServer, layerRef.current?.getChildren());
    });

    socket.on(LISTENERS_MAP.SendingAppStateToClient, (state: any) => {
      setLines(state?.lines ?? []);
      setTexts(state?.texts ?? []);
      setShapes(state?.shapes ?? []);
      setCollaborators(state?.userCursors ?? []);
    });
  }, [layerRef]);

  useEffect(() => {
    setSelectedItemIds([]);
    if (mode === 'pencil' || mode === 'text') {
      document.documentElement.style.cursor = 'crosshair'
    } else {
      document.documentElement.style.cursor = ''
    }
  }, [mode]);

  const handleSelectItem = (id: string) => {
    if (mode !== 'selection') return;
    setSelectedItemIds([id]);
  }

  const handleDeselect = () => {
    if (mode !== 'selection') return;
    setSelectedItemIds([]);
  };

  const handleMouseOverItem = () => {
    if (mode !== 'selection') return;
    document.documentElement.style.cursor = 'move';
  };

  const handleMouseLeaveItem = () => {
    if (mode !== 'selection') return;
    document.documentElement.style.cursor = '';
  };

  return (
    <Stage
      className="flex justify-center"
      ref={stageRef}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          setSelectedItemIds([]);
        }

        if (mode === 'text' && !textEditor.active) {
          textEditorRef.current?.focus();
          setTextEditor((prev) => ({
            ...prev,
            active: true,
            x: e.evt.clientX,
            y: e.evt.clientY,
          }))
        } else {
          if (textEditor.value !== '') {
            const newTexts = [...texts, {
              id: crypto.randomUUID(),
              x: textEditor.x,
              y: textEditor.y + 6,
              text: textEditor.value,
            }]
            setTexts(newTexts)
          }
          setTextEditor((prev) => ({
            ...prev,
            active: false,
            value: ''
          }))
          setMode('selection');
        }
      }}
      onMouseDown={(e) => {
        if (mode !== 'pencil') return;

        startDrawing();

        const pos = e.target.getStage()?.getPointerPosition();

        if (pos == null) return;

        const newLines = [...lines, { id: crypto.randomUUID(), points: [pos.x, pos.y]}];

        setLines(newLines);
      }}
      width={window.innerWidth}
      height={window.innerHeight}
      draggable={stageDraggable}
      onDragStart={() => {
        document.documentElement.style.cursor = 'grabbing';
      }}
      onDragEnd={() => {
        document.documentElement.style.cursor = '';
      }}
      onMouseMove={(e) => {
        const baseInfo = {
          id: userId,
          userName: `User #${collaborators.length + 1}`,
        };
        const newCollaborators =
          collaborators.find((c) => c.id === baseInfo.id) == null
            ? [...collaborators, { ...baseInfo, x: e.evt.clientX, y: e.evt.clientY }]
            : collaborators.map((cursor) => {
                if (cursor.id !== baseInfo.id) return cursor;
                return {
                  ...cursor,
                  x: e.evt.clientX,
                  y: e.evt.clientY,
                };
              });
        socket.emit(LISTENERS_MAP.SendingAppStateToServer, {
          lines,
          shapes,
          texts,
          userCursors: newCollaborators,
        });
        setCollaborators(newCollaborators);

        if (!isDrawing) return;

        const vector = e.target.getStage()?.getPointerPosition();

        if (vector == null) return;

        const lastLine = lines[lines.length - 1]

        const newLines = lines.map((line) => line.id === lastLine.id ? ({
          ...line,
          points: [...line.points, vector.x, vector.y],
        }) : line)

        setLines(newLines);
      }}
      onMouseUp={stopDrawing}
    >
      <Layer>
        <Html
          divProps={{
            style: {
              position: 'fixed',
              top: '24px',
              left: '',
              transform: '',
            },
          }}
        >
          <div className="bg-slate-200 text-black p-1 rounded">
            <ul className="flex items-center gap-4">
              {ACTIONS_MODES.map((action) => (
                <ActionItem
                  label={capitalize(action)}
                  selected={mode === action}
                  onClick={() => {
                    setMode(action)
                  }}
                />
              ))}
              <ActionItem
                label="Create Rect"
                selected={false}
                onClick={() => {
                  setMode('selection');
                  setShapes((prev) => [
                    ...prev,
                    {
                      id: prev.length.toString(),
                      x: window.innerWidth / 2,
                      y: window.innerHeight / 2,
                    },
                  ]);
                }}
              />
              <ActionItem
                label="Clear all"
                selected={false}
                onClick={() => {
                  setMode('selection');
                  setLines([])
                  setShapes([]);
                  setSelectedItemIds([]);
                  setTexts([]);
                  socket.emit(LISTENERS_MAP.SendingAppStateToServer, {
                    lines: [],
                    shapes: [],
                    texts: [],
                    userCursors: [],
                  });
                }}
              />
            </ul>
          </div>
        </Html>
        <Html
          divProps={{
            style: {
              top: '',
              position: 'fixed',
              bottom: '12px',
              right: '12px',
              left: '',
              transform: '',
            },
          }}
        >
          <div className="bg-slate-200 text-black p-1 rounded">
            <label className="flex items-center gap-2">
              <p>Username</p>
              <input
                className="bg-transparent"
                type="text"
                value={collaborators.find((c) => c.id === userId)?.userName ?? ''}
                onChange={(e) => {
                  setCollaborators((prev) =>
                    prev.map((cursor) => {
                      if (cursor.id !== userId) return cursor;
                      return {
                        ...cursor,
                        userName: e.target.value,
                      };
                    }),
                  );
                }}
              />
            </label>
          </div>
        </Html>

        {textEditor.active && mode === 'text' && (
          <Html
            divProps={{
              style: {
                position: 'fixed',
                top: `${textEditor.y}px`,
                left: `${textEditor.x}px`,
                transform: '',
              },
            }}>
            <textarea autoFocus className="text-lg focus-within:outline-none border resize text-black bg-transparent" ref={textEditorRef} value={textEditor.value} onChange={(e) => setTextEditor((prev) => ({
              ...prev,
              value: e.target.value,
            }))} type="text" />
          </Html>
        )}
      </Layer>

      <Layer ref={layerRef}>
        {texts.map((item) => (
          <LText
            key={item.id}
            {...item}
            draggable={mode === 'selection'}
            isSelected={selectedItemIds.includes(item.id)}
            onSelect={() => {
              handleSelectItem(item.id);
            }}
            onDragStart={() => {
              handleSelectItem(item.id);
            }}
            onDragEnd={handleDeselect}
            onMouseOver={handleMouseOverItem}
            onMouseLeave={handleMouseLeaveItem}
            onChange={(newAttrs) => {
              setTexts((prev) => {
                const newTexts = prev.map((prevItem) =>
                  prevItem.id === item.id
                    ? {
                        ...prevItem,
                        ...newAttrs,
                      }
                    : prevItem,
                );

                socket.emit(LISTENERS_MAP.SendingAppStateToServer, {
                  lines,
                  userCursors: collaborators,
                  shapes,
                  texts: newTexts,
                });

                return newTexts;
              });
            }}

          />
        ))}
        {lines.map((line, i) => (
          <LLine
            key={i}
            draggable={mode === 'selection'}
            {...line}
            isSelected={selectedItemIds.includes(line.id)}
            onSelect={() => {
              handleSelectItem(line.id);
            }}
            onDragStart={() => {
              handleSelectItem(line.id);
            }}
            onDragEnd={handleDeselect}
            onMouseOver={handleMouseOverItem}
            onMouseLeave={handleMouseLeaveItem}
            onChange={(newAttrs) => {
              setLines((prev) => {
                const newLines = prev.map((prevItem) =>
                  prevItem.id === line.id
                    ? {
                        ...prevItem,
                        ...newAttrs,
                      }
                    : prevItem,
                );

                socket.emit(LISTENERS_MAP.SendingAppStateToServer, {
                  userCursors: collaborators,
                  shapes,
                  texts,
                  lines: newLines,
                });

                return newLines;
              });
            }}
          />
        ))}
        {collaborators
          .filter((c) => c.id !== userId)
          .map((cursor, idx) => (
            <React.Fragment key={idx}>
              <Line
                x={cursor.x}
                y={cursor.y}
                points={[0, 0, 5, 5, 0, 8]}
                closed
                stroke={COLORS.Tomato}
                fill={COLORS.Tomato}
              />
              <Text
                fill={COLORS.Tomato}
                text={cursor.userName ?? `User #${idx + 1}`}
                x={cursor.x + 8}
                y={cursor.y}
              />
            </React.Fragment>
          ))}
        {shapes.map((shape) => (
          <LRect
            key={shape.id}
            draggable={mode === 'selection'}
            {...shape}
            isSelected={selectedItemIds.includes(shape.id)}
            onSelect={() => {
              handleSelectItem(shape.id);
            }}
            onDragStart={() => {
              handleSelectItem(shape.id);
            }}
            onDragEnd={handleDeselect}
            onMouseOver={handleMouseOverItem}
            onMouseLeave={handleMouseLeaveItem}
            onChange={(newAttrs) => {
              setShapes((prev) => {
                const newStars = prev.map((star) =>
                  star.id === newAttrs.id
                    ? {
                        ...star,
                        ...newAttrs,
                      }
                    : star,
                );

                socket.emit(LISTENERS_MAP.SendingAppStateToServer, {
                  lines,
                  texts,
                  userCursors: collaborators,
                  shapes: newStars,
                });

                return newStars;
              });
            }}
          />
        ))}
      </Layer>
    </Stage>
  );
};

export default App;
