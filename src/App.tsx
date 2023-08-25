import Konva from 'konva';
import React, { useState } from 'react';
import { ComponentProps } from 'react';
import { Transformer } from 'react-konva';
import { Stage, Layer, Star, Text } from 'react-konva';
import { useBoolean, useEventListener } from 'usehooks-ts';

function generateShapes() {
  return [...Array(10)].map((_, i) => ({
    id: i.toString(),
    x: Math.random() * window.innerWidth,
    y: Math.random() * window.innerHeight,
    rotation: Math.random() * 180,
    isDragging: false,
  }));
}

const INITIAL_STATE = generateShapes();

const LStart = ({ isSelected, onSelect, onChange, ...starProps }: ComponentProps<typeof Star> & {
  isSelected: boolean;
  onSelect: VoidFunction;
  onChange: (starProps: ComponentProps<typeof Star>) => void;
}) => {
  const starRef = React.useRef<Konva.Star>(null);
  const trRef = React.useRef<Konva.Transformer>(null);

  React.useEffect(() => {
    if (isSelected) {
      // we need to attach transformer manually
      trRef.current!.nodes([starRef.current!]);
      trRef.current!.getLayer()?.batchDraw();
    }
  }, [isSelected]);

  return (
    <>
      <Star
        ref={starRef}
        numPoints={5}
        innerRadius={20}
        outerRadius={40}
        fill="#89b717"
        opacity={0.8}
        draggable
        shadowColor="black"
        onClick={onSelect}
        onTap={onSelect}
        // id={star.id}
        // x={star.x}
        // y={star.y}
        // rotation={star.rotation}
        {...starProps}
        shadowBlur={10}
        shadowOpacity={0.6}
        shadowOffsetX={starProps.isDragging ? 10 : 5}
        shadowOffsetY={starProps.isDragging ? 10 : 5}
        scaleX={starProps.isDragging ? 1.2 : 1}
        scaleY={starProps.isDragging ? 1.2 : 1}
        // onDragStart={handleDragStart}
        // onDragEnd={handleDragEnd}

        onDragEnd={(e) => {
          onChange({
            ...starProps,
            x: e.target.x(),
            y: e.target.y(),
          });
        }}
        onTransformEnd={(e) => {
          // transformer is changing scale of the node
          // and NOT its width or height
          // but in the store we have only width and height
          // to match the data better we will reset scale on transform end
          const node = starRef.current!;
          const scaleX = node.scaleX();
          const scaleY = node.scaleY();

          // we will reset it back
          node.scaleX(1);
          node.scaleY(1);
          onChange({
            ...starProps,
            x: node.x(),
            y: node.y(),
            // set minimal value
            width: Math.max(5, node.width() * scaleX),
            height: Math.max(node.height() * scaleY),
          });
        }}
      />
      {isSelected && (
        <Transformer
          ref={trRef}
          boundBoxFunc={(oldBox, newBox) => {
            // limit resize
            if (newBox.width < 5 || newBox.height < 5) {
              return oldBox;
            }
            return newBox;
          }}
        />
      )}
    </>
  )
}


// TODO
// create util for updating document.documentElement.style.cursor;

const App = () => {
  const [stars, setStars] = React.useState(INITIAL_STATE);
  const [selectedShapeIds, setSelectedShapeIds] = React.useState<string[]>([]);
  const stageRef = React.useRef<Konva.Stage>(null)
  const {
    value: stageDraggable,
    setTrue: enableStageDraggable,
    setFalse: disableStageDraggable,
  } = useBoolean(false)
  console.log('stageRef:', stageRef);

  useEventListener('keydown', (e) => {
    if (e.code !== 'Space') return;
    document.documentElement.style.cursor = 'grab';
    enableStageDraggable();
  })
  useEventListener('keyup', (e) => {
    if (e.code !== 'Space') return;
    document.documentElement.style.cursor = '';
    disableStageDraggable();
  })

  useEventListener('keydown', (e) => {
    if (e.code !== 'Backspace') return;
    setStars((prev) => (
      prev.filter((star) => !selectedShapeIds.includes(star.id))
    ))
  })
  return (
    <Stage
      ref={stageRef}
      onClick={(e) => {
        console.log('e:', e);
        if (e.target === e.currentTarget) {
          setSelectedShapeIds([])
          console.log('clicked on stage');
        }
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
    >
      <Layer>
        <Text text="Try to drag a star" />
        {stars.map((star) => (
          <LStart
            key={star.id}
            numPoints={5}
            innerRadius={20}
            outerRadius={40}
            fill="#89b717"
            opacity={0.8}
            draggable
            shadowColor="black"
            {...star}
            isSelected={selectedShapeIds.includes(star.id)}
            onSelect={() => {
              setSelectedShapeIds([star.id]);
            }}
            onDragStart={() => {
              setSelectedShapeIds([star.id]);
            }}
            onDragEnd={() => {
              setSelectedShapeIds([]);
            }}
            onChange={(newAttrs) => {
              setStars((prev) => (
                prev.map((star) => (
                  star.id === newAttrs.id ? {
                    ...star,
                    ...newAttrs,
                  } : star
                ))
              ));
            }}
            onMouseOver={() => {
              document.documentElement.style.cursor = 'move';
            }}
            onMouseLeave={() => {
              document.documentElement.style.cursor = '';
            }}
            shadowBlur={10}
            shadowOpacity={0.6}
          />
        ))}
      </Layer>
    </Stage>
  );
};


export default App
