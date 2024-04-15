import vtkITKHelper from '@kitware/vtk.js/Common/DataModel/ITKHelper';
import vtkLiteHttpDataAccessHelper from '@kitware/vtk.js/IO/Core/DataAccessHelper/LiteHttpDataAccessHelper';
import vtkResourceLoader from '@kitware/vtk.js/IO/Core/ResourceLoader';
import vtkColorMaps from '@kitware/vtk.js/Rendering/Core/ColorTransferFunction/ColorMaps.js';
import { unzipSync } from 'fflate';
import { useContext, useEffect, useState } from 'react';
import './PET_CT_Overlay.css';

import {
  Contexts,
  Dataset,
  MultiViewRoot,
  RegisterDataSet,
  ShareDataSetRoot,
  SliceRepresentation,
  UseDataSet,
  View,
} from 'react-vtk-js';

function Slider(props) {
  const view = useContext(Contexts.ViewContext);
  const onChange = (e) => {
    const value = Number(e.currentTarget.value);
    props.setValue(value);
    if (props.setCTValue) {
      props.setCTValue(value * 4);
    }
    setTimeout(view?.renderView, 0);
  };
  return (
    <label
      style={{
        position: 'absolute',
        zIndex: 100,
        left: props.style.width + 10,
        ...props.style,
      }}
    >
      {props.label}
      <input
        type='range'
        orient={props.orient}
        min={props.min}
        max={props.max}
        step={props.step}
        value={props.value}
        onChange={onChange}
        style={{
          zIndex: 100,
          ...props.style,
        }}
      />
    </label>
  );
}

function DropDown(props) {
  const view = useContext(Contexts.ViewContext);
  function onChange(e) {
    const value = e.currentTarget.value;
    props.setValue(value);
    setTimeout(view?.renderView, 0);
  }
  return (
    <form>
      <label
        htmlFor={props.label}
        style={{
          position: 'relative',
          zIndex: 100,
          left: '-50px',
          ...props.style,
        }}
      >
        {props.label}
      </label>
      <select
        id={props.label}
        value={props.value}
        onChange={onChange}
        style={{
          position: 'relative',
          zIndex: 100,
          left: '50px',
          top: '5px',
          ...props.style,
        }}
      >
        {props.options.map((opt) => (
          <option key={opt}>{opt}</option>
        ))}
      </select>
    </form>
  );
}

const loadData = async () => {
  console.log('Loading itk module...');
  loadData.setStatusText('Loading itk module...');
  if (!window.itk) {
    await vtkResourceLoader.loadScript(
      'https://cdn.jsdelivr.net/npm/itk-wasm@1.0.0-b.8/dist/umd/itk-wasm.js'
    );
  }

  console.log('Fetching/downloading the input file, please wait...');
  loadData.setStatusText('Loading data, please wait...');
  const zipFileData = await vtkLiteHttpDataAccessHelper.fetchBinary(
    'https://data.kitware.com/api/v1/folder/661ad10a5165b19d36c87220/download'
  );

  console.log('Fetching/downloading input file done!');
  loadData.setStatusText('Download complete!');

  const zipFileDataArray = new Uint8Array(zipFileData);
  const decompressedFiles = unzipSync(zipFileDataArray);
  const ctDCMFiles = [];
  const ptDCMFiles = [];
  const PTRe = /PET AC/;
  const CTRe = /CT IMAGES/;
  Object.keys(decompressedFiles).forEach((relativePath) => {
    if (relativePath.endsWith('.dcm')) {
      if (PTRe.test(relativePath)) {
        ptDCMFiles.push(decompressedFiles[relativePath].buffer);
      } else if (CTRe.test(relativePath)) {
        ctDCMFiles.push(decompressedFiles[relativePath].buffer);
      }
    }
  });

  let ctImageData = null;
  let ptImageData = null;
  if (window.itk) {
    const { image: ctitkImage, webWorkerPool: ctWebWorkers } =
      await window.itk.readImageDICOMArrayBufferSeries(ctDCMFiles);
    ctWebWorkers.terminateWorkers();
    ctImageData = vtkITKHelper.convertItkToVtkImage(ctitkImage);
    const { image: ptitkImage, webWorkerPool: ptWebWorkers } =
      await window.itk.readImageDICOMArrayBufferSeries(ptDCMFiles);
    ptWebWorkers.terminateWorkers();
    ptImageData = vtkITKHelper.convertItkToVtkImage(ptitkImage);
  }
  loadData.setMaxKSlice(ctImageData.getDimensions()[2] - 1);
  loadData.setMaxJSlice(ptImageData.getDimensions()[1] - 1);
  const range = ptImageData?.getPointData()?.getScalars()?.getRange();
  loadData.setPTColorWindow(range[1] - range[0]);
  loadData.setPTColorLevel((range[1] + range[0]) * 0.5);
  loadData.setStatusText('');
  loader.hidden = 'hidden';
  return [ctImageData, ptImageData];
};

function Example(props) {
  const [statusText, setStatusText] = useState('Loading data, please wait ...');
  const [kSlice, setKSlice] = useState(0);
  const [jSlice, setJSlice] = useState(0);
  const [ctjSlice, setCTJSlice] = useState(0);
  const [colorWindow, setColorWindow] = useState(2048);
  const [colorLevel, setColorLevel] = useState(0);
  const [ptcolorWindow, setPTColorWindow] = useState(69222);
  const [ptcolorLevel, setPTColorLevel] = useState(34611);
  const [colorPreset, setColorPreset] = useState('jet');
  const [opacity, setOpacity] = useState(0.4);
  const [maxKSlice, setMaxKSlice] = useState(310);
  const [maxJSlice, setMaxJSlice] = useState(110);
  loadData.setMaxKSlice = setMaxKSlice;
  loadData.setMaxJSlice = setMaxJSlice;
  loadData.setStatusText = setStatusText;
  loadData.setPTColorWindow = setPTColorWindow;
  loadData.setPTColorLevel = setPTColorLevel;

  useEffect(() => {
    loadData().then(([ctData, ptData]) => {
      window.ctData = ctData;
      window.ptData = ptData;
      setKSlice(155);
      setJSlice(64);
      setCTJSlice(256);
    });
  }, []);

  return (
    <MultiViewRoot>
      <ShareDataSetRoot>
        <RegisterDataSet id='ctData'>
          <Dataset dataset={window.ctData} />
        </RegisterDataSet>
        <RegisterDataSet id='ptData'>
          <Dataset dataset={window.ptData} />
        </RegisterDataSet>
        <div
          style={{
            display: 'flex',
            flexFlow: 'row',
            flexWrap: 'wrap',
            width: '100%',
            height: '100%',
          }}
        >
          <label
            style={{
              position: 'absolute',
              zIndex: 100,
              left: '45%',
              top: '65%',
              fontSize: '25px',
            }}
          >
            {statusText}
          </label>
          <Slider
            label='Color Level'
            max={4095}
            value={colorLevel}
            setValue={setColorLevel}
            style={{ top: '60px', left: '205px' }}
          />
          <Slider
            label='Color Window'
            max={4095}
            value={colorWindow}
            setValue={setColorWindow}
            style={{ top: '60px', left: '455px' }}
          />
          <Slider
            label='PET Opacity'
            min={0.0}
            step={0.1}
            max={1.0}
            value={opacity}
            setValue={setOpacity}
            style={{ top: '30px', left: '5px' }}
          />
          <DropDown
            label='Color Preset'
            options={vtkColorMaps.rgbPresetNames}
            value={colorPreset}
            setValue={setColorPreset}
            style={{ top: '30px', left: '305px' }}
          />
          <div className='loader' id='loader' />
          <div
            style={{
              position: 'absolute',
              left: '0px',
              width: '50%',
              height: '100%',
            }}
          >
            <View
              id='0'
              camera={{
                position: [0, 0, 0],
                focalPoint: [0, 0, -1],
                viewUp: [0, -1, 0],
                parallelProjection: true,
              }}
              background={[0, 0, 0]}
            >
              <Slider
                label='Slice'
                max={maxKSlice}
                value={kSlice}
                setValue={setKSlice}
                orient='vertical'
                style={{ top: '50%', left: '1%' }}
              />
              <SliceRepresentation
                kSlice={kSlice}
                mapper={{
                  resolveCoincidentTopology: 'Polygon',
                  resolveCoincidentTopologyPolygonOffsetParameters: {
                    factor: 0,
                    offset: 2,
                  },
                }}
                property={{
                  opacity,
                  colorWindow: ptcolorWindow,
                  colorLevel: ptcolorLevel,
                }}
                colorMapPreset={colorPreset}
                useLookupTableScalarRange={false}
              >
                <UseDataSet id='ptData' />
              </SliceRepresentation>
              <SliceRepresentation
                kSlice={kSlice}
                property={{
                  colorWindow,
                  colorLevel,
                }}
              >
                <UseDataSet id='ctData' />
              </SliceRepresentation>
            </View>
          </div>
          <div
            style={{
              position: 'absolute',
              left: '50%',
              width: '50%',
              height: '100%',
            }}
          >
            <View
              id='0'
              camera={{
                position: [0, 0, 0],
                focalPoint: [0, -1, 0],
                viewUp: [0, 0, 1],
                parallelProjection: true,
              }}
              background={[0, 0, 0]}
            >
              <Slider
                label='Slice'
                max={maxJSlice}
                value={jSlice}
                setValue={setJSlice}
                setCTValue={setCTJSlice}
                orient='vertical'
                style={{ top: '50%', left: '5%' }}
              />
              <SliceRepresentation
                id='pt'
                jSlice={jSlice}
                mapper={{
                  resolveCoincidentTopology: 'Polygon',
                  resolveCoincidentTopologyPolygonOffsetParameters: {
                    factor: 0,
                    offset: 2,
                  },
                }}
                property={{
                  opacity,
                  colorWindow: ptcolorWindow,
                  colorLevel: ptcolorLevel,
                }}
                colorMapPreset={colorPreset}
                useLookupTableScalarRange={false}
              >
                <UseDataSet id='ptData' />
              </SliceRepresentation>
              <SliceRepresentation
                jSlice={ctjSlice}
                property={{
                  colorWindow,
                  colorLevel,
                }}
              >
                <UseDataSet id='ctData' />
              </SliceRepresentation>
            </View>
          </div>
        </div>
      </ShareDataSetRoot>
    </MultiViewRoot>
  );
}

export default Example;