import Konva from 'konva';
import React, { useEffect, useRef, useState } from 'react';
import { Line } from 'react-konva';
import { Stage, Layer, Text } from 'react-konva';
import { Html } from 'react-konva-utils';
import { io } from 'socket.io-client';
import { useBoolean, useEventListener } from 'usehooks-ts';
import cn from './lib/utils/cn';
import LRect from './components/LRect';
const socket = io('http://localhost:3001');

// TODO
// create util for updating document.documentElement.style.cursor; // https://konvajs.org/docs/styling/Mouse_Cursor.html
// console.log('layerRef:', stageRef.current?.toCanvas().toDataURL('base64', 1));

function ActionItem({
  label,
  selected,
  className,
  ...buttonProps
}: {
  selected: boolean;
  label: React.ReactNode;
} & React.DetailedHTMLProps<React.ButtonHTMLAttributes<HTMLButtonElement>, HTMLButtonElement>) {
  return (
    <li>
      <button
        {...buttonProps}
        className={cn(
          'py-0.5 px-1.5 rounded bg-transparent border-none hover:bg-blue-200 transition-colors hover:text-black/90 cursor-pointer',
          {
            'bg-blue-300': selected,
            'bg-gray-400 text-black/50': buttonProps.disabled,
          },
          className,
        )}
      >
        {label}
      </button>
    </li>
  );
}

const LISTENERS_MAP = {
  ClientReady: 'client-ready',
  GetCanvasState: 'get-canvas-state',
  SendingAppStateToServer: 'sending-app-state-to-server',
  SendingAppStateToClient: 'sending-app-state-to-client',
} as const;

const COLORS = {
  LightGreen: 'rgba(52, 239, 121, 0.87)',
  Tomato: 'tomato',
} as const;

type Entity = {
  id: ReturnType<typeof crypto.randomUUID>;
}
type Point = {
  x: number;
  y: number;
}

type ActionMode = 'selection' | 'pencil' | 'rect' | 'text';
const userId = crypto.randomUUID();

const App = () => {
  const [shapes, setShapes] = React.useState<Konva.Node['attrs'][]>([]);
  const [lines, setLines] = React.useState<({ points: number[] } & Entity)[]>([]);
  const textEditorRef = useRef<HTMLTextAreaElement>(null)
  const [selectedShapeIds, setSelectedShapeIds] = React.useState<string[]>([]);
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
    setShapes((prev) => prev.filter((star) => !selectedShapeIds.includes(star.id)));
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
    if (mode === 'pencil' || mode === 'text') {
      document.documentElement.style.cursor = 'crosshair'
    } else {
      document.documentElement.style.cursor = ''
    }
  }, [mode]);

  return (
    <Stage
      className="flex justify-center"
      ref={stageRef}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          setSelectedShapeIds([]);
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
          // create text if value is not empty
          setTextEditor((prev) => ({
            ...prev,
            active: false,
            value: ''
          }))
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
      onMouseUp={() => {
        stopDrawing();
      }}
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
              <ActionItem
                label="Selection"
                selected={mode === 'selection'}
                onClick={() => {
                  setMode('selection')
                }}
              />
              <ActionItem
                label="Pencil"
                selected={mode === 'pencil'}
                onClick={() => {
                  setMode('pencil')
                }}
              />
              <ActionItem
                label="Text"
                selected={mode === 'text'}
                onClick={() => {
                  setMode('text')
                }}
              />
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
                  setSelectedShapeIds([]);
                  setTexts([]);
                  socket.emit(LISTENERS_MAP.SendingAppStateToServer, {
                    lines: [],
                    shapes: [],
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
          <Text
            fontSize={18}
            key={item.id}
            text={item.text}
            x={item.x}
            y={item.y}
          />
        ))}
        {lines.map((line, i) => (
          <Line
            key={i}
            points={line.points}
            stroke="black"
            strokeWidth={5}
            tension={0.2}
            lineCap="round"
            lineJoin="round"
            globalCompositeOperation="source-over"
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
            draggable
            shadowColor="black"
            {...shape}
            isSelected={selectedShapeIds.includes(shape.id)}
            onSelect={() => {
              setSelectedShapeIds([shape.id]);
            }}
            onDragStart={() => {
              setSelectedShapeIds([shape.id]);
            }}
            onDragEnd={() => {
              setSelectedShapeIds([]);
            }}
            onChange={(newAttrs) => {
              const newStars = shapes.map((star) =>
                star.id === newAttrs.id
                  ? {
                      ...star,
                      ...newAttrs,
                    }
                  : star,
              );

              socket.emit(LISTENERS_MAP.SendingAppStateToServer, {
                lines,
                userCursors: collaborators,
                shapes: newStars,
              });
              setShapes(newStars);
            }}
            onMouseOver={() => {
              document.documentElement.style.cursor = 'move';
            }}
            onMouseLeave={() => {
              document.documentElement.style.cursor = '';
            }}
          />
        ))}
      </Layer>
    </Stage>
  );
};

export default App;
