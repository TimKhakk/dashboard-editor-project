import Konva from "konva";
import React, { ComponentProps } from "react";
import { Line, Transformer } from "react-konva";

const LLine = ({
  isSelected,
  onSelect,
  onChange,
  ...restProps
}: ComponentProps<typeof Line> & {
  isSelected: boolean;
  onSelect: VoidFunction;
  onChange: (starProps: ComponentProps<typeof Line>) => void;
}) => {
  const lineRef = React.useRef<Konva.Line>(null);
  const trRef = React.useRef<Konva.Transformer>(null);

  React.useEffect(() => {
    if (isSelected) {
      // we need to attach transformer manually
      trRef.current!.nodes([lineRef.current!]);
      trRef.current!.getLayer()?.batchDraw();
    }
  }, [isSelected]);

  return (
    <>
      <Line
        ref={lineRef}
        stroke="black"
        strokeWidth={5}
        tension={0.2}
        lineCap="round"
        lineJoin="round"
        globalCompositeOperation="source-over"
        draggable
        onClick={onSelect}
        onTap={onSelect}
        {...restProps}
        onDragEnd={(e) => {
          onChange({
            ...restProps,
            x: e.target.x(),
            y: e.target.y(),
          });
        }}
        onTransformEnd={() => {
          const node = lineRef.current!;

          onChange({
            ...restProps,
            x: node.x(),
            y: node.y(),
            rotation: node.rotation(),
          });
        }}
      />
      {isSelected && (
        <Transformer
          ref={trRef}
          resizeEnabled={false}
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
  );
};

export default LLine;
