import Konva from "konva";
import React, { ComponentProps } from "react";
import { Rect, Transformer } from "react-konva";

const LRect = ({
  isSelected,
  onSelect,
  onChange,
  ...starProps
}: ComponentProps<typeof Rect> & {
  isSelected: boolean;
  onSelect: VoidFunction;
  onChange: (starProps: ComponentProps<typeof Rect>) => void;
}) => {
  const rectRef = React.useRef<Konva.Rect>(null);
  const trRef = React.useRef<Konva.Transformer>(null);

  React.useEffect(() => {
    if (isSelected) {
      // we need to attach transformer manually
      trRef.current!.nodes([rectRef.current!]);
      trRef.current!.getLayer()?.batchDraw();
    }
  }, [isSelected]);

  return (
    <>
      <Rect
        ref={rectRef}
        stroke="black"
        width={50}
        height={50}
        draggable
        onClick={onSelect}
        onTap={onSelect}
        {...starProps}
        onDragEnd={(e) => {
          onChange({
            ...starProps,
            x: e.target.x(),
            y: e.target.y(),
          });
        }}
        onTransformEnd={() => {
          // transformer is changing scale of the node
          // and NOT its width or height
          // but in the store we have only width and height
          // to match the data better we will reset scale on transform end
          const node = rectRef.current!;
          const scaleX = node.scaleX();
          const scaleY = node.scaleY();

          // we will reset it back
          node.scaleX(1);
          node.scaleY(1);
          onChange({
            ...starProps,
            x: node.x(),
            y: node.y(),
            rotation: node.rotation(),
            // set minimal value
            width: Math.max(5, node.width() * scaleX),
            height: Math.max(node.height() * scaleY),
            stroke: node.stroke(),
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
  );
};

export default LRect;
